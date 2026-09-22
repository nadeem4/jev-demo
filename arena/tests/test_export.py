import json

from arena.export import export_site


def _write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data))


def test_exports_recordings_an_index_and_results_for_a_static_site(tmp_path):
    src, out = tmp_path / "arena", tmp_path / "public" / "data"
    _write(src / "runs" / "snake" / "jev" / "seed-0.json", [{"type": "start"}])
    _write(src / "runs" / "snake" / "jev" / "seed-3.json", [{"type": "start"}])
    _write(src / "results" / "snake" / "20260101-000000.json", {"started": "old"})
    _write(src / "results" / "snake" / "20260202-000000.json", {"started": "new"})

    export_site(src / "runs", src / "results", out)

    assert json.loads((out / "runs" / "snake" / "jev" / "seed-3.json").read_text()) == [{"type": "start"}]
    assert json.loads((out / "runs.json").read_text()) == {"snake": {"jev": [0, 3]}}
    assert [r["started"] for r in json.loads((out / "results.json").read_text())["snake"]] == ["new", "old"]


def test_replaces_a_previous_export(tmp_path):
    src, out = tmp_path / "arena", tmp_path / "data"
    _write(out / "runs" / "gone" / "x" / "seed-0.json", [])
    (src / "runs").mkdir(parents=True)
    export_site(src / "runs", src / "results", out)
    assert not (out / "runs" / "gone").exists()
    assert json.loads((out / "results.json").read_text()) == {}
