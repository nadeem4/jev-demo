"""Decision agents. Every agent has a `name` and one method:

    decide(state, questions) -> {question_id: answer}

`state` is what the model reads and `questions` are Jev-shaped typed questions
(choice / score / noul). Model-specific code lives in its own module:
jev.py, laya.py, baselines.py. This file is the only place agents are chosen.
"""
import os

from . import baselines, jev, laya
from .baselines import ConstantAgent, RandomAgent

AGENT_NAMES = ["jev", "laya", "idle", "random"]


def make_agent(name, seed=0, laya_checkpoint=None):
    if name == "jev":
        return jev.from_env()
    if name == "laya":
        return laya.load(os.environ.get("LAYA_PATH", "models/laya"), laya_checkpoint)
    if name == "idle":
        return ConstantAgent("IDLE")
    if name == "random":
        return RandomAgent(seed)
    raise ValueError(f"unknown agent: {name}")


__all__ = ["AGENT_NAMES", "make_agent", "ConstantAgent", "RandomAgent", "baselines", "jev", "laya"]
