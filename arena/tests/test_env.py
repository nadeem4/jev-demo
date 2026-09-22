import pytest
from arena.highway.env import make_env, snapshot, frame


@pytest.fixture
def env():
    env = make_env()
    env.reset(seed=0)
    return env


def test_snapshot_reads_ego_lane_and_speed(env):
    snap = snapshot(env)
    assert (snap["lane"], snap["lanes"], snap["speed"]) == (3, 4, 25.0)


def test_snapshot_gives_other_cars_relative_to_ego(env):
    # Seed 0: a car in lane 2, ~18 m ahead, ~3.9 m/s slower.
    car = next(c for c in snapshot(env)["others"] if c["lane"] == 2)
    assert car["dx"] == pytest.approx(18.1, abs=0.1)
    assert car["dv"] == pytest.approx(-3.9, abs=0.1)


def test_frame_has_positions_for_rendering(env):
    f = frame(env)
    assert f["ego"]["x"] == pytest.approx(177.5, abs=0.1)
    assert f["ego"]["y"] == pytest.approx(12.0)
    assert {"x", "y", "heading", "speed"} <= set(f["ego"])
    assert len(f["others"]) > 0
