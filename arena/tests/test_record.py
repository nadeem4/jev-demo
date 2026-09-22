import json

from arena.agents import ConstantAgent
from arena.record import record_episode


def test_writes_the_event_stream_to_game_agent_seed_path(tmp_path):
    path = record_episode("highway", ConstantAgent("IDLE"), seed=7, out_dir=tmp_path, max_steps=2)
    assert path == tmp_path / "highway" / "always-IDLE" / "seed-7.json"
    events = json.loads(path.read_text())
    assert [e["type"] for e in events] == ["start", "step", "step", "end"]
