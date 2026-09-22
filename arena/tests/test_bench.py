import json

import pytest

from arena.agents import ConstantAgent
from arena.bench import aggregate, mean_ci, run_benchmark, wilson


def test_wilson_interval_for_a_rate():
    low, high = wilson(2, 3)
    assert low == pytest.approx(0.208, abs=0.01)
    assert high == pytest.approx(0.939, abs=0.01)


def test_wilson_interval_stays_inside_zero_and_one():
    assert wilson(0, 5)[0] == 0.0
    assert wilson(5, 5)[1] == pytest.approx(1.0)


def test_mean_with_95_percent_interval():
    mean, low, high = mean_ci([10.0, 20.0, 30.0])
    assert mean == 20.0
    assert low < 20.0 < high


def test_mean_of_one_value_has_no_interval():
    assert mean_ci([7.0]) == (7.0, None, None)


def _episode(crashed, distance, latencies, confidences, errors=0, retries=0):
    steps = [{"type": "step", "latency_ms": l, "action": "A",
              "answers": {"action": {"probabilities": {"A": c}}}} for l, c in zip(latencies, confidences)]
    for s in steps[:errors]:
        s["error"], s["answers"] = "boom", None
    if steps and retries:
        steps[0]["retries"] = retries
    return [{"type": "start"}, *steps, {"type": "end", "steps": len(steps), "crashed": crashed, "distance_m": distance}]


def test_aggregates_episode_metrics_and_decision_stats():
    episodes = [
        _episode(True, 100.0, [100, 200], [0.4, 0.6], retries=3),
        _episode(False, 300.0, [300, 400], [0.8, 1.0], errors=1),
    ]
    s = aggregate(episodes)
    assert s["episodes"] == 2
    assert s["metrics"]["crashed"]["rate"] == 0.5
    assert s["metrics"]["distance_m"]["mean"] == 200.0
    assert s["metrics"]["steps"]["mean"] == 2.0
    assert s["decisions"]["count"] == 4
    assert s["decisions"]["failed"] == 1
    assert s["decisions"]["retries"] == 3
    assert s["decisions"]["latency_p50_ms"] == 250.0
    assert s["decisions"]["avg_confidence"] == pytest.approx((0.4 + 0.6 + 1.0) / 3, abs=0.001)


def test_runs_every_agent_on_the_same_seeds_and_saves_results(tmp_path):
    results = run_benchmark(
        "highway", ["idle", "random"], seeds=[0, 1], out_dir=tmp_path, max_steps=2,
        make=lambda name, game, seed: ConstantAgent("IDLE") if name == "idle" else ConstantAgent("SLOWER"),
    )
    assert results["game"] == "highway"
    assert results["seeds"] == [0, 1]
    assert set(results["agents"]) == {"idle", "random"}
    assert results["agents"]["idle"]["episodes"] == 2
    saved = json.loads(results["path"].read_text())
    assert saved["agents"]["idle"]["metrics"]["crashed"]["rate"] == 0.0
    assert (tmp_path / "runs" / "highway" / "always-IDLE" / "seed-1.json").exists()
