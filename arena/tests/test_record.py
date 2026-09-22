import json

from arena.agents import ConstantAgent
from arena.record import make_agent, record_episode, summarize


def test_writes_the_event_stream_to_game_agent_seed_path(tmp_path):
    path = record_episode(ConstantAgent("IDLE"), seed=7, out_dir=tmp_path, max_steps=2)
    assert path == tmp_path / "highway" / "always-IDLE" / "seed-7.json"
    events = json.loads(path.read_text())
    assert [e["type"] for e in events] == ["start", "step", "step", "end"]


def test_summarize_aggregates_episode_ends():
    ends = [
        {"crashed": True, "distance_m": 100.0, "total_reward": 5.0, "avg_speed": 22.0, "steps": 10},
        {"crashed": False, "distance_m": 300.0, "total_reward": 15.0, "avg_speed": 26.0, "steps": 40},
    ]
    s = summarize(ends, latencies=[100.0, 200.0, 300.0])
    assert s["episodes"] == 2
    assert s["crash_rate"] == 0.5
    assert s["avg_distance_m"] == 200.0
    assert s["avg_reward"] == 10.0
    assert s["latency_p50_ms"] == 200.0


def test_jev_prefers_a_typesafe_key_over_the_gateway(monkeypatch):
    monkeypatch.setenv("TYPESAFE_API_KEY", "ts")
    monkeypatch.setenv("AI_GATEWAY_API_KEY", "gw")
    assert make_agent("jev").provider == "typesafe"


def test_jev_falls_back_to_the_gateway_key(monkeypatch, tmp_path):
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
    monkeypatch.setenv("AI_GATEWAY_API_KEY", "gw")
    monkeypatch.setattr("arena.record.ROOT_ENV", tmp_path / "missing.env")
    assert make_agent("jev").provider == "gateway"
