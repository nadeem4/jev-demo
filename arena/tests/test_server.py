import json
import threading
import urllib.request

import pytest

from arena.agents import ConstantAgent
from arena.server import list_runs, sse, live_events, make_server


def test_sse_formats_one_event_per_message():
    assert sse({"type": "end"}) == 'data: {"type": "end"}\n\n'


def test_list_runs_groups_seeds_by_game_and_agent(tmp_path):
    for agent, seed in [("jev", 0), ("jev", 2), ("laya", 1)]:
        (tmp_path / "highway" / agent).mkdir(parents=True, exist_ok=True)
        (tmp_path / "highway" / agent / f"seed-{seed}.json").write_text("[]")
    assert list_runs(tmp_path) == {"highway": {"jev": [0, 2], "laya": [1]}}


def test_list_runs_is_empty_without_a_runs_folder(tmp_path):
    assert list_runs(tmp_path / "missing") == {}


def test_live_events_announce_loading_then_stream_the_episode():
    events = list(live_events("highway", "idle", seed=0, max_steps=2, get_agent=lambda name, game, seed: ConstantAgent("IDLE")))
    assert events[0] == {"type": "status", "message": "Starting idle"}
    assert [e["type"] for e in events[1:]] == ["start", "step", "step", "end"]


def test_live_events_report_agent_errors_instead_of_crashing():
    def broken(name, game, seed):
        raise RuntimeError("model files missing")
    events = list(live_events("highway", "laya", seed=0, max_steps=1, get_agent=broken))
    assert events[-1]["type"] == "error"
    assert "model files missing" in events[-1]["message"]


@pytest.fixture
def server(tmp_path):
    (tmp_path / "highway" / "jev").mkdir(parents=True)
    (tmp_path / "highway" / "jev" / "seed-0.json").write_text('[{"type": "start"}]')
    srv = make_server(port=0, runs_dir=tmp_path, get_agent=lambda name, game, seed: ConstantAgent("IDLE"))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()


def get(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.headers.get_content_type(), r.read().decode()


def test_root_points_to_the_ui(server):
    kind, body = get(server + "/")
    assert kind == "text/plain"
    assert "localhost:3000" in body


def test_serves_the_run_index_and_a_recording(server):
    assert json.loads(get(server + "/api/runs")[1]) == {"highway": {"jev": [0]}}
    assert json.loads(get(server + "/api/runs/highway/jev/0")[1]) == [{"type": "start"}]


def test_allows_the_ui_on_another_port_to_connect(server):
    with urllib.request.urlopen(server + "/api/runs", timeout=30) as r:
        assert r.headers["Access-Control-Allow-Origin"] == "*"
    with urllib.request.urlopen(server + "/api/live?agent=idle&seed=0&max_steps=1", timeout=30) as r:
        assert r.headers["Access-Control-Allow-Origin"] == "*"


def test_listens_only_on_this_machine_by_default():
    srv = make_server(port=0)
    assert srv.server_address[0] == "127.0.0.1"
    srv.server_close()


def test_can_listen_on_all_interfaces_inside_a_container():
    srv = make_server(port=0, host="0.0.0.0")
    assert srv.server_address[0] == "0.0.0.0"
    srv.server_close()


def test_viewer_disconnects_are_treated_as_normal():
    from arena.server import VIEWER_GONE
    assert issubclass(ConnectionAbortedError, VIEWER_GONE)


def test_rejects_paths_outside_the_runs_folder(server):
    with pytest.raises(urllib.error.HTTPError) as e:
        get(server + "/api/runs/highway/..%2F..%2Fsecret/0")
    assert e.value.code == 404


def test_streams_a_live_episode_as_server_sent_events(server):
    kind, body = get(server + "/api/live?game=highway&agent=idle&seed=0&max_steps=2")
    assert kind == "text/event-stream"
    types = [json.loads(line[6:])["type"] for line in body.splitlines() if line.startswith("data: ")]
    assert types == ["status", "start", "step", "step", "end"]


def test_live_episodes_default_to_highway(server):
    body = get(server + "/api/live?agent=idle&seed=0&max_steps=1")[1]
    start = next(json.loads(l[6:]) for l in body.splitlines() if '"start"' in l)
    assert start["game"] == "highway"


def test_rejects_unknown_games(server):
    with pytest.raises(urllib.error.HTTPError) as e:
        get(server + "/api/live?game=chess&agent=idle&seed=0")
    assert e.value.code == 400
