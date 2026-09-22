"""Jev, TypeSafe AI's closed decision model, called over HTTP.

Two routes to the same model:
- TypeSafe directly (TYPESAFE_API_KEY): pinned version, no extra network hop. Preferred.
- Vercel AI Gateway (AI_GATEWAY_API_KEY): same headers the AI SDK sends. Rate-limits often.
"""
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

GATEWAY_URL = "https://ai-gateway.vercel.sh/v4/ai/evaluation-model"
TYPESAFE_URL = "https://api.typesafe.ai/v1/systemone"
TYPESAFE_MODEL = "jev-1.13.0"  # pinned so benchmark runs are reproducible
ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"  # repo root, shared by all demos


def _http_post(url, headers, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


class JevAgent:
    name = "jev"
    RETRYABLE = {429, 529}  # rate limited / overloaded

    def __init__(self, api_key, provider="gateway", post=_http_post, max_retries=5, backoff_s=1.0):
        self.provider, self.post, self.max_retries, self.backoff_s = provider, post, max_retries, backoff_s
        self.last_latency_ms, self.last_retries = None, 0
        self.headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        if provider == "gateway":
            self.url = GATEWAY_URL
            self.headers.update({
                "ai-model-id": "typesafe-ai/jev",
                "ai-evaluation-model-specification-version": "4",
                "ai-gateway-protocol-version": "0.0.1",
                "ai-gateway-auth-method": "api-key",
            })
        else:
            self.url = TYPESAFE_URL

    def _body(self, state, questions):
        body = {"state": state, "questions": questions}
        return body if self.provider == "gateway" else {"model": TYPESAFE_MODEL, **body}

    def decide(self, state, questions):
        """Retries rate limits with exponential backoff. last_latency_ms covers
        only the successful attempt, so waiting out a 429 isn't counted as Jev's speed."""
        for attempt in range(self.max_retries + 1):
            started = time.perf_counter()
            try:
                answers = self.post(self.url, self.headers, self._body(state, questions))["answers"]
            except urllib.error.HTTPError as e:
                if e.code not in self.RETRYABLE or attempt == self.max_retries:
                    raise
                time.sleep(self.backoff_s * 2 ** attempt)
                continue
            self.last_latency_ms = (time.perf_counter() - started) * 1000
            self.last_retries = attempt
            return answers


def _key(var):
    """Reads a key from the environment, then from the repo-root .env."""
    if key := os.environ.get(var):
        return key
    lines = ROOT_ENV.read_text().splitlines() if ROOT_ENV.exists() else []
    return next((l.split("=", 1)[1].strip() for l in lines if l.startswith(f"{var}=")), None)


def from_env():
    if key := _key("TYPESAFE_API_KEY"):
        return JevAgent(api_key=key, provider="typesafe")
    return JevAgent(api_key=_key("AI_GATEWAY_API_KEY"), provider="gateway")
