"""Decision agents. Every agent has a `name` and one method:

    decide(state, questions) -> {question_id: answer}

`state` is what the model reads and `questions` are Jev-shaped typed questions
(choice / score / noul). Model-specific code lives in its own module:
jev.py, laya.py, baselines.py. This file is the only place agents are chosen.
Jev and Laya play every game; baselines are defined by each game.
"""
import os

from . import baselines, jev, laya
from .baselines import ConstantAgent, RandomAgent

MODELS = ["jev", "laya"]


def _game_class(game):
    from ..games import GAMES  # games import baselines from this package
    if game not in GAMES:
        raise ValueError(f"unknown game: {game}")
    return GAMES[game]


def agent_names(game):
    return MODELS + list(_game_class(game).baselines)


def make_agent(name, game="highway", seed=0, laya_checkpoint=None):
    if name == "jev":
        return jev.from_env()
    if name == "laya":
        return laya.load(os.environ.get("LAYA_PATH", "models/laya"), laya_checkpoint)
    game_baselines = _game_class(game).baselines
    if name in game_baselines:
        return game_baselines[name](seed)
    raise ValueError(f"unknown agent: {name}")


__all__ = ["MODELS", "agent_names", "make_agent", "ConstantAgent", "RandomAgent", "baselines", "jev", "laya"]
