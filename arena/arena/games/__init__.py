"""Games the arena can run. Each game is a class with:

    name, questions, options, fallback, baselines
    reset(seed)       start a new episode; the same seed gives the same episode
    describe() -> {}  the text the model reads before each decision
    step(action)      apply one option; returns True when the episode is over
    frame() -> {}     what the UI draws
    summary() -> {}   the game's own metrics, always including "steps"
    close()
"""
from .blackjack import BlackjackGame
from .highway import HighwayGame
from .snake import SnakeGame

GAMES = {"highway": HighwayGame, "snake": SnakeGame, "blackjack": BlackjackGame}
GAME_NAMES = list(GAMES)


def make_game(name):
    if name not in GAMES:
        raise ValueError(f"unknown game: {name}")
    return GAMES[name]()
