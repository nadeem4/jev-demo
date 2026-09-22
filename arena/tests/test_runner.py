from arena.agents import ConstantAgent
from arena.runner import run_episode


def run(agent, game="highway", **kw):
    return list(run_episode(game, agent, seed=0, **kw))


def test_starts_with_the_game_agent_seed_and_initial_frame():
    start = run(ConstantAgent("IDLE"), max_steps=1)[0]
    assert start["type"] == "start"
    assert (start["game"], start["agent"], start["seed"]) == ("highway", "always-IDLE", 0)
    assert start["frame"]["ego"]["y"] == 12.0


def test_start_lists_the_options_the_model_chooses_from():
    start = run(ConstantAgent("IDLE"), max_steps=1)[0]
    assert start["options"] == ["LANE_LEFT", "IDLE", "LANE_RIGHT", "FASTER", "SLOWER"]


def test_step_events_record_what_the_model_saw_and_chose():
    step = run(ConstantAgent("IDLE"), max_steps=1)[1]
    assert step["type"] == "step"
    assert step["state"]["your_lane"] == "rightmost of 4 lanes"
    assert step["action"] == "IDLE"
    assert step["answers"]["action"]["choice"] == "IDLE"
    assert isinstance(step["latency_ms"], float)
    assert "ego" in step["frame"]


def test_chosen_action_is_applied():
    events = run(ConstantAgent("LANE_LEFT"), max_steps=3)
    steps = [e for e in events if e["type"] == "step"]
    assert steps[-1]["frame"]["ego"]["y"] < 12.0  # moved left from the rightmost lane


def test_ends_with_the_game_summary():
    end = run(ConstantAgent("IDLE"), max_steps=3)[-1]
    assert end["type"] == "end"
    assert end["steps"] == 3
    assert set(end) >= {"crashed", "distance_m", "total_reward", "avg_speed"}
    assert end["distance_m"] > 0


def test_agent_failure_falls_back_to_the_game_default_and_is_recorded():
    class Broken:
        name = "broken"
        def decide(self, state, questions):
            raise RuntimeError("529 overloaded")
    step = run(Broken(), max_steps=1)[1]
    assert step["action"] == "IDLE"
    assert "529" in step["error"]
    assert step["answers"] is None


def test_an_answer_outside_the_options_falls_back_too():
    class Confused(ConstantAgent):
        def decide(self, state, questions):
            return {"action": {"type": "choice", "choice": "FLY", "probabilities": {}}}
    step = run(Confused("x"), max_steps=1)[1]
    assert step["action"] == "IDLE"
    assert "FLY" in step["error"]


def test_uses_agent_reported_latency_and_retries_when_available():
    class Reporting(ConstantAgent):
        def decide(self, state, questions):
            self.last_latency_ms, self.last_retries = 42.0, 2
            return super().decide(state, questions)
    step = run(Reporting("IDLE"), max_steps=1)[1]
    assert step["latency_ms"] == 42.0
    assert step["retries"] == 2


def test_same_seed_gives_identical_starts():
    first = lambda: run(ConstantAgent("IDLE"), max_steps=1)[0]["frame"]
    assert first() == first()
