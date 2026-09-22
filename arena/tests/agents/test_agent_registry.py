import pytest

from arena import agents
from arena.agents import agent_names, make_agent


def test_every_game_offers_jev_laya_and_its_own_baselines():
    assert agent_names("highway") == ["jev", "laya", "idle", "random"]


def test_builds_a_game_baseline_by_name():
    assert make_agent("idle", game="highway").name == "always-IDLE"
    assert make_agent("random", game="highway").name == "random"


def test_builds_jev_from_the_environment(monkeypatch):
    monkeypatch.setenv("AI_GATEWAY_API_KEY", "gw")
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
    assert make_agent("jev").name == "jev"


def test_loads_laya_from_the_laya_path_setting(monkeypatch):
    seen = {}
    monkeypatch.setenv("LAYA_PATH", "/models/laya")
    monkeypatch.setattr(agents.laya, "load", lambda path, checkpoint: seen.update(path=path, checkpoint=checkpoint) or "agent")
    assert make_agent("laya", laya_checkpoint="multilingual") == "agent"
    assert seen == {"path": "/models/laya", "checkpoint": "multilingual"}


def test_rejects_agents_the_game_does_not_have():
    with pytest.raises(ValueError, match="unknown agent"):
        make_agent("gpt", game="highway")
