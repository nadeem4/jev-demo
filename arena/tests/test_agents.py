from arena.agents import JevAgent, LayaAgent, ConstantAgent, RandomAgent

QUESTIONS = {"action": {"type": "choice", "instructions": "Pick", "criteria": {"A": "a", "B": "b"}}}
STATE = {"road": "clear"}


def test_jev_posts_state_and_questions_to_the_gateway():
    sent = {}
    def post(url, headers, body):
        sent.update(url=url, headers=headers, body=body)
        return {"answers": {"action": {"type": "choice", "choice": "B", "probabilities": {"A": 0.1, "B": 0.9}}}}
    agent = JevAgent(api_key="k", post=post)
    answers = agent.decide(STATE, QUESTIONS)
    assert answers["action"]["choice"] == "B"
    assert sent["url"].endswith("/evaluation-model")
    assert sent["headers"]["Authorization"] == "Bearer k"
    assert sent["headers"]["ai-model-id"] == "typesafe-ai/jev"
    assert sent["body"] == {"state": STATE, "questions": QUESTIONS}


def _http_error(code):
    import urllib.error
    return urllib.error.HTTPError("u", code, "err", {}, None)


def test_jev_retries_rate_limits_and_overload_then_succeeds():
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


def test_jev_gives_up_after_max_retries():
    def post(url, headers, body):
        raise _http_error(429)
    agent = JevAgent(api_key="k", post=post, backoff_s=0, max_retries=2)
    try:
        agent.decide(STATE, QUESTIONS)
        assert False, "expected an error"
    except Exception as e:
        assert "429" in str(e)


def test_jev_does_not_retry_other_errors():
    calls = []
    def post(url, headers, body):
        calls.append(1)
        raise _http_error(401)
    try:
        JevAgent(api_key="k", post=post, backoff_s=0).decide(STATE, QUESTIONS)
    except Exception:
        pass
    assert len(calls) == 1


def test_jev_reports_latency_of_the_successful_attempt_only():
    import time
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


def test_laya_returns_the_model_answers():
    class FakeModel:
        def predict(self, state, questions):
            return {"answers": {"action": {"choice": "A", "probabilities": {"A": 0.7, "B": 0.3}}}}
    assert LayaAgent(model=FakeModel()).decide(STATE, QUESTIONS)["action"]["choice"] == "A"


def test_constant_agent_always_picks_its_option_with_certainty():
    answers = ConstantAgent("A").decide(STATE, QUESTIONS)
    assert answers["action"] == {"type": "choice", "choice": "A", "probabilities": {"A": 1.0, "B": 0.0}}


def test_random_agent_is_reproducible_with_a_seed():
    a, b = RandomAgent(3), RandomAgent(3)
    assert [a.decide(STATE, QUESTIONS)["action"]["choice"] for _ in range(20)] == \
           [b.decide(STATE, QUESTIONS)["action"]["choice"] for _ in range(20)]


def test_agents_have_display_names():
    assert JevAgent(api_key="k").name == "jev"
    assert LayaAgent(model=object()).name == "laya"
    assert ConstantAgent("A").name == "always-A"
    assert RandomAgent(0).name == "random"
