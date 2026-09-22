"""Blackjack (Gymnasium Blackjack-v1, Sutton & Barto rules): stick or hit.

An episode is a session of hands dealt from one seed, so every agent gets the same
cards. Winnings are noisy even with perfect play, so the sharper metric is how
often each decision matches basic strategy, the known optimal stick/hit play.
"""
import re

import gymnasium as gym
from gymnasium.envs.toy_text.blackjack import sum_hand, usable_ace

from ..agents.baselines import ConstantAgent, RandomAgent

ACTIONS = ["STICK", "HIT"]  # Gymnasium: 0 = stick, 1 = hit

QUESTIONS = {
    "action": {
        "type": "choice",
        "instructions": "You are playing blackjack against the dealer. Get closer to 21 than the dealer without going over. Pick your move.",
        "criteria": {
            "STICK": "Stand: take no more cards and let the dealer play.",
            "HIT": "Take another card.",
        },
    }
}


def basic_strategy(total, dealer, soft):
    """Optimal stick/hit play when the dealer stands on 17. `dealer` is the up card, ace = 1."""
    if soft:
        if total >= 19:
            return "STICK"
        if total == 18:
            return "STICK" if 2 <= dealer <= 8 else "HIT"
        return "HIT"
    if total >= 17:
        return "STICK"
    if 13 <= total <= 16:
        return "STICK" if 2 <= dealer <= 6 else "HIT"
    if total == 12:
        return "STICK" if 4 <= dealer <= 6 else "HIT"
    return "HIT"


def _card(value):
    return {1: "an ace", 8: "an 8"}.get(value, f"a {value}")


class BlackjackGame:
    name = "blackjack"
    questions = QUESTIONS
    options = ACTIONS
    fallback = "STICK"

    def __init__(self, hands=20):
        self.n_hands = hands

    def reset(self, seed):
        self.env = gym.make("Blackjack-v1", sab=True)
        self.env.reset(seed=seed)  # later hands continue the same seeded deck
        self.steps = self.hands = self.wins = self.losses = self.draws = self.matches = 0
        self.net = 0.0
        self.last_hand = self.advice = None

    def _hand(self):
        u = self.env.unwrapped
        return sum_hand(u.player), u.dealer[0], bool(usable_ace(u.player))

    def describe(self):
        total, dealer, soft = self._hand()
        kind = "soft: an ace counts as 11, so one more card cannot bust you" if soft else "hard: no ace counted as 11"
        return {"your_hand": f"{total} ({kind})", "dealer_shows": _card(dealer), "hand": f"{self.hands + 1} of {self.n_hands}"}

    def step(self, action):
        total, dealer, soft = self._hand()
        self.advice = basic_strategy(total, dealer, soft)
        self.matches += action == self.advice
        self.steps += 1
        _, reward, terminated, _, _ = self.env.step(ACTIONS.index(action))
        if not terminated:
            return False
        u = self.env.unwrapped
        result = "win" if reward > 0 else "loss" if reward < 0 else "draw"
        self.last_hand = {"player": list(u.player), "dealer": list(u.dealer), "result": result, "reward": float(reward)}
        self.hands += 1
        self.net += float(reward)
        self.wins += reward > 0
        self.losses += reward < 0
        self.draws += reward == 0
        if self.hands >= self.n_hands:
            return True
        self.env.reset()
        return False

    def frame(self):
        u = self.env.unwrapped
        return {"player": list(u.player), "dealer_up": u.dealer[0], "last_hand": self.last_hand, "advice": self.advice,
                "hands": self.hands, "of": self.n_hands, "wins": self.wins, "losses": self.losses,
                "draws": self.draws, "net": self.net}

    def summary(self):
        return {"steps": self.steps, "hands": self.hands, "wins": self.wins, "losses": self.losses, "draws": self.draws,
                "net": self.net, "return_per_hand": round(self.net / self.hands, 3) if self.hands else 0.0,
                "basic_strategy_match": round(self.matches / self.steps, 3) if self.steps else 0.0}

    @staticmethod
    def reference(state):
        """The optimal move for this hand, used to score decisions and calibration."""
        total = int(re.match(r"(\d+)", state["your_hand"])[1])
        up = state["dealer_shows"].split()[-1]
        return basic_strategy(total, 1 if up == "ace" else int(up), state["your_hand"].split("(")[1].startswith("soft"))

    def close(self):
        self.env.close()


class BasicStrategy:
    """Baseline: the optimal stick/hit play. Reads the same text the models read."""
    name = "basic-strategy"

    def __init__(self, seed):
        pass

    def decide(self, state, questions):
        total = int(re.match(r"(\d+)", state["your_hand"])[1])
        soft = state["your_hand"].split("(")[1].startswith("soft")
        up = state["dealer_shows"].split()[-1]
        pick = basic_strategy(total, 1 if up == "ace" else int(up), soft)
        return {"action": {"type": "choice", "choice": pick, "probabilities": {a: float(a == pick) for a in ACTIONS}}}


BlackjackGame.baselines = {
    "basic-strategy": BasicStrategy,
    "always-stick": lambda seed: ConstantAgent("STICK"),
    "random": RandomAgent,
}
