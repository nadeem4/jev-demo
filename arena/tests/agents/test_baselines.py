from arena.agents.baselines import ConstantAgent, RandomAgent

QUESTIONS = {"action": {"type": "choice", "instructions": "Pick", "criteria": {"A": "a", "B": "b"}}}


def test_constant_agent_always_picks_its_option_with_certainty():
    answers = ConstantAgent("A").decide({}, QUESTIONS)
    assert answers["action"] == {"type": "choice", "choice": "A", "probabilities": {"A": 1.0, "B": 0.0}}


def test_random_agent_is_reproducible_with_a_seed():
    a, b = RandomAgent(3), RandomAgent(3)
    assert [a.decide({}, QUESTIONS)["action"]["choice"] for _ in range(20)] == \
           [b.decide({}, QUESTIONS)["action"]["choice"] for _ in range(20)]
