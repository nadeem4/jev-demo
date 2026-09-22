from arena.agents.laya import LayaAgent, ensure_weights

QUESTIONS = {"action": {"type": "choice", "instructions": "Pick", "criteria": {"A": "a", "B": "b"}}}


def test_downloads_weights_into_a_plain_folder_when_missing(tmp_path):
    calls = []
    target = tmp_path / "models" / "laya"
    ensure_weights(target, download=lambda **kw: calls.append(kw))
    assert calls == [{"repo_id": "convaiinnovations/laya", "local_dir": str(target)}]


def test_skips_the_download_when_weights_exist(tmp_path):
    (tmp_path / "model.safetensors").write_text("x")
    calls = []
    ensure_weights(tmp_path, download=lambda **kw: calls.append(kw))
    assert calls == []


def test_returns_the_model_answers():
    class FakeModel:
        def predict(self, state, questions):
            return {"answers": {"action": {"choice": "A", "probabilities": {"A": 0.7, "B": 0.3}}}}
    assert LayaAgent(model=FakeModel()).decide({}, QUESTIONS)["action"]["choice"] == "A"
