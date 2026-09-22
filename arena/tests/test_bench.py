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
    assert (tmp_path / "runs" / "highway" / "idle" / "seed-1.json").exists()  # saved under the name it was chosen by


def test_resumes_from_saved_episodes_instead_of_replaying_them(tmp_path):
    made = []
    def make(name, game, seed):
        made.append(seed)
        return ConstantAgent("IDLE")
    run_benchmark("highway", ["idle"], seeds=[0, 1], out_dir=tmp_path, max_steps=2, make=make)
    made.clear()
    results = run_benchmark("highway", ["idle"], seeds=[0, 1, 2], out_dir=tmp_path, max_steps=2, make=make)
    assert made == [2]  # seeds 0 and 1 were already saved
    assert results["agents"]["idle"]["episodes"] == 3


def test_fresh_run_ignores_saved_episodes(tmp_path):
    made = []
    make = lambda name, game, seed: made.append(seed) or ConstantAgent("IDLE")
    run_benchmark("highway", ["idle"], seeds=[0], out_dir=tmp_path, max_steps=2, make=make)
    run_benchmark("highway", ["idle"], seeds=[0], out_dir=tmp_path, max_steps=2, make=make, fresh=True)
    assert made == [0, 0]


def test_writes_results_after_each_agent_so_a_stopped_run_keeps_them(tmp_path):
    def make(name, game, seed):
        if name == "random":
            raise KeyboardInterrupt  # stopped during the second agent
        return ConstantAgent("IDLE")
    try:
        run_benchmark("highway", ["idle", "random"], seeds=[0], out_dir=tmp_path, max_steps=2, make=make)
    except KeyboardInterrupt:
        pass
    saved = [json.loads(f.read_text()) for f in (tmp_path / "results" / "highway").glob("*.json")]
    assert len(saved) == 1 and list(saved[0]["agents"]) == ["idle"]


def test_reports_cpu_when_the_gpu_is_visible_but_unusable():
    from arena.bench import usable_device

    class BrokenCuda:  # the GPU shows up, but running on it fails (e.g. a driver that is too old)
        class cuda:
            @staticmethod
            def is_available():
                return True
        @staticmethod
        def zeros(*a, **kw):
            raise RuntimeError("CUDA error: device unavailable")

    class NoCuda:
        class cuda:
            @staticmethod
            def is_available():
                return False

    assert usable_device(BrokenCuda) == "cpu"
    assert usable_device(NoCuda) == "cpu"


def test_intervals_for_non_negative_metrics_do_not_go_below_zero():
    episodes = [[{"type": "start"}, {"type": "end", "steps": 1, "food_eaten": v}] for v in [0, 0, 0, 9]]
    assert aggregate(episodes)["metrics"]["food_eaten"]["ci95"][0] == 0.0


def _graded(action, prob):
    return {"type": "step", "state": {"x": "1"}, "action": action, "latency_ms": 1,
            "answers": {"action": {"probabilities": {action: prob, "other": 1 - prob}}}}


def test_scores_decisions_against_the_game_reference_when_it_has_one():
    episodes = [[{"type": "start"}, _graded("good", 0.9), _graded("bad", 0.8), {"type": "end", "steps": 2}]]
    s = aggregate(episodes, reference=lambda state: "good")
    assert s["reference"]["matches"] == 0.5
    # said 90% and was right, said 80% and was wrong: average gap = (0.1 + 0.8) / 2
    assert s["reference"]["confidence_gap"] == pytest.approx(0.45, abs=0.001)
    assert s["reference"]["bins"] == [{"said": "80-90%", "right": 0.0, "of": 1}, {"said": "90-100%", "right": 1.0, "of": 1}]


def test_leaves_the_reference_out_when_the_game_has_none():
    episodes = [[{"type": "start"}, _graded("a", 0.9), {"type": "end", "steps": 1}]]
    assert "reference" not in aggregate(episodes)
