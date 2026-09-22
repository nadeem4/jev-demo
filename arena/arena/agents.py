"""Decision agents. Every agent answers Jev-shaped questions:
decide(state, questions) -> {question_id: answer}."""
import json
import random
import time
import urllib.error
import urllib.request

GATEWAY_URL = "https://ai-gateway.vercel.sh/v4/ai/evaluation-model"


def _http_post(url, headers, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


class JevAgent:
    """TypeSafe's Jev, either through Vercel AI Gateway (same headers the AI SDK
    sends) or directly from TypeSafe with a pinned model version."""
    name = "jev"

    RETRYABLE = {429, 529}  # rate limited / overloaded
    TYPESAFE_URL = "https://api.typesafe.ai/v1/systemone"
    TYPESAFE_MODEL = "jev-1.13.0"  # pinned so benchmark runs are reproducible

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
            self.url = self.TYPESAFE_URL

    def _body(self, state, questions):
        body = {"state": state, "questions": questions}
        return body if self.provider == "gateway" else {"model": self.TYPESAFE_MODEL, **body}

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


class LayaAgent:
    """Open-source Laya, run locally. `model` is a loaded laya.Agent."""
    name = "laya"

    def __init__(self, model):
        self.model = model

    @classmethod
    def load(cls, path="models/laya", subfolder=None):
        import laya  # heavy import (torch); only needed when Laya actually runs
        return cls(laya.load(path, subfolder=subfolder) if subfolder else laya.load(path))

    def decide(self, state, questions):
        return self.model.predict(state, questions)["answers"]


def _choice(options, pick):
    return {"type": "choice", "choice": pick, "probabilities": {o: float(o == pick) for o in options}}


class ConstantAgent:
    """Baseline: always picks the same option."""

    def __init__(self, option):
        self.option = option
        self.name = f"always-{option}"

    def decide(self, state, questions):
        return {qid: _choice(list(q["criteria"]), self.option) for qid, q in questions.items()}


class RandomAgent:
    """Baseline: picks uniformly at random (seeded)."""
    name = "random"

    def __init__(self, seed):
        self.rng = random.Random(seed)

    def decide(self, state, questions):
        return {qid: _choice(list(q["criteria"]), self.rng.choice(list(q["criteria"]))) for qid, q in questions.items()}
