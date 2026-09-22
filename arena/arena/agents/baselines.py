"""Trivial drivers that show what "no intelligence" scores."""
import random


def _choice(options, pick):
    return {"type": "choice", "choice": pick, "probabilities": {o: float(o == pick) for o in options}}


class ConstantAgent:
    """Always picks the same option."""

    def __init__(self, option):
        self.option = option
        self.name = f"always-{option}"

    def decide(self, state, questions):
        return {qid: _choice(list(q["criteria"]), self.option) for qid, q in questions.items()}


class RandomAgent:
    """Picks uniformly at random (seeded, so runs are reproducible)."""
    name = "random"

    def __init__(self, seed):
        self.rng = random.Random(seed)

    def decide(self, state, questions):
        return {qid: _choice(list(q["criteria"]), self.rng.choice(list(q["criteria"]))) for qid, q in questions.items()}
