"""Jev, TypeSafe AI's closed decision model, called over OpenRouter.

`systemone` is the TypeSafe-compatible route: it takes `state` and `questions`
and answers each question. `chat/completions` rejects that shape. Decision
models are hidden from the default model listing; find them under
`/api/v1/models?output_modalities=decisions`.
"""
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

OPENROUTER_URL = "https://openrouter.ai/api/v1/systemone"
JEV_MODEL = "typesafe/jev-1.13-20260917"  # the explicit version, not the ~typesafe/jev-latest alias, so runs are reproducible
ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"  # repo root, shared by all demos


def _http_post(url, headers, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


class JevAgent:
    name = "jev"
    RETRYABLE = {429, 529}  # rate limited / overloaded

    def __init__(self, api_key, post=_http_post, max_retries=5, backoff_s=1.0):
        self.post, self.max_retries, self.backoff_s = post, max_retries, backoff_s
        self.last_latency_ms, self.last_retries = None, 0
        self.url = OPENROUTER_URL
        self.headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    def _body(self, state, questions):
        return {"model": JEV_MODEL, "state": state, "questions": questions}

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
    return JevAgent(api_key=_key("OPENROUTER_API_KEY"))
