import time
import urllib.error

from arena.agents import jev
from arena.agents.jev import JevAgent

QUESTIONS = {"action": {"type": "choice", "instructions": "Pick", "criteria": {"A": "a", "B": "b"}}}
STATE = {"road": "clear"}


def _http_error(code):
    return urllib.error.HTTPError("u", code, "err", {}, None)


def test_posts_state_and_questions_to_the_gateway():
    sent = {}
    def post(url, headers, body):
        sent.update(url=url, headers=headers, body=body)
        return {"answers": {"action": {"type": "choice", "choice": "B", "probabilities": {"A": 0.1, "B": 0.9}}}}
    answers = JevAgent(api_key="k", post=post).decide(STATE, QUESTIONS)
    assert answers["action"]["choice"] == "B"
    assert sent["url"].endswith("/evaluation-model")
    assert sent["headers"]["Authorization"] == "Bearer k"
    assert sent["headers"]["ai-model-id"] == "typesafe-ai/jev"
    assert sent["body"] == {"state": STATE, "questions": QUESTIONS}


def test_can_call_typesafe_directly_with_a_pinned_model():
    sent = {}
    def post(url, headers, body):
        sent.update(url=url, headers=headers, body=body)
        return {"answers": {"ok": True}}
    agent = JevAgent(api_key="ts", provider="typesafe", post=post)
    assert agent.decide(STATE, QUESTIONS) == {"ok": True}
    assert sent["url"] == "https://api.typesafe.ai/v1/systemone"
    assert sent["headers"]["Authorization"] == "Bearer ts"
    assert "ai-model-id" not in sent["headers"]
    assert sent["body"] == {"model": "jev-1.13.0", "state": STATE, "questions": QUESTIONS}


def test_retries_rate_limits_and_overload_then_succeeds():
    calls = []
    def post(url, headers, body):
        calls.append(1)
        if len(calls) < 3:
            raise _http_error(429 if len(calls) == 1 else 529)
        return {"answers": {"ok": True}}
    agent = JevAgent(api_key="k", post=post, backoff_s=0)
    assert agent.decide(STATE, QUESTIONS) == {"ok": True}
    assert len(calls) == 3
    assert agent.last_retries == 2


def test_gives_up_after_max_retries():
    def post(url, headers, body):
        raise _http_error(429)
    agent = JevAgent(api_key="k", post=post, backoff_s=0, max_retries=2)
    try:
        agent.decide(STATE, QUESTIONS)
        assert False, "expected an error"
    except Exception as e:
        assert "429" in str(e)


def test_does_not_retry_other_errors():
    calls = []
    def post(url, headers, body):
        calls.append(1)
        raise _http_error(401)
    try:
        JevAgent(api_key="k", post=post, backoff_s=0).decide(STATE, QUESTIONS)
    except Exception:
        pass
    assert len(calls) == 1


def test_reports_latency_of_the_successful_attempt_only():
    calls = []
    def post(url, headers, body):
        calls.append(1)
        if len(calls) == 1:
            time.sleep(0.2)
            raise _http_error(429)
        return {"answers": {}}
    agent = JevAgent(api_key="k", post=post, backoff_s=0)
    agent.decide(STATE, QUESTIONS)
    assert agent.last_latency_ms < 150


def test_from_env_prefers_a_typesafe_key_over_the_gateway(monkeypatch):
    monkeypatch.setenv("TYPESAFE_API_KEY", "ts")
    monkeypatch.setenv("AI_GATEWAY_API_KEY", "gw")
    assert jev.from_env().provider == "typesafe"


def test_from_env_falls_back_to_the_gateway_key(monkeypatch, tmp_path):
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
    monkeypatch.setenv("AI_GATEWAY_API_KEY", "gw")
    monkeypatch.setattr(jev, "ROOT_ENV", tmp_path / "missing.env")
    assert jev.from_env().provider == "gateway"


def test_from_env_reads_the_repo_root_env_file(monkeypatch, tmp_path):
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
    monkeypatch.delenv("AI_GATEWAY_API_KEY", raising=False)
    env = tmp_path / ".env"
    env.write_text("AI_GATEWAY_API_KEY=from-file\n")
    monkeypatch.setattr(jev, "ROOT_ENV", env)
    assert jev.from_env().headers["Authorization"] == "Bearer from-file"
