"""Does the model actually read the situation?

Each game has pairs of opposite situations where the right answer clearly differs.
Sensitivity is how far a model's answer moves between them (total variation
distance: 0 means the same answer to both, 1 means completely different).
A model that answers the same regardless is guessing, however confident it sounds.

    uv run python -m arena.probe --agents jev laya
"""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from .agents import MODELS, agent_names, make_agent
from .games import GAME_NAMES, make_game

CONTRASTS = {
    "blackjack": [
        {"why": "8 cannot bust, 20 almost certainly does",
         "a": {"your_hand": "8 (hard: no ace counted as 11)", "dealer_shows": "a 10", "hand": "1 of 20"},
         "b": {"your_hand": "20 (hard: no ace counted as 11)", "dealer_shows": "a 10", "hand": "1 of 20"}},
        {"why": "on 16 the dealer's card decides it",
         "a": {"your_hand": "16 (hard: no ace counted as 11)", "dealer_shows": "a 6", "hand": "1 of 20"},
         "b": {"your_hand": "16 (hard: no ace counted as 11)", "dealer_shows": "a 10", "hand": "1 of 20"}},
        {"why": "a soft 17 cannot bust, a hard 17 can",
         "a": {"your_hand": "17 (soft: an ace counts as 11, so one more card cannot bust you)", "dealer_shows": "a 9", "hand": "1 of 20"},
         "b": {"your_hand": "17 (hard: no ace counted as 11)", "dealer_shows": "a 9", "hand": "1 of 20"}},
    ],
    "highway": [
        {"why": "a car right in front, or an empty road",
         "a": {"your_lane": "lane 2 of 4 (counting from the left)", "your_speed": "25 m/s (allowed range 20-30)",
               "ahead_in_your_lane": "car very close ahead (6 m), 5 m/s slower than you", "left_lane": "clear", "right_lane": "clear"},
         "b": {"your_lane": "lane 2 of 4 (counting from the left)", "your_speed": "25 m/s (allowed range 20-30)",
               "ahead_in_your_lane": "clear", "left_lane": "clear", "right_lane": "clear"}},
        {"why": "the left lane is free, or blocked",
         "a": {"your_lane": "lane 2 of 4 (counting from the left)", "your_speed": "25 m/s (allowed range 20-30)",
               "ahead_in_your_lane": "car close ahead (14 m), 4 m/s slower than you", "left_lane": "clear", "right_lane": "BLOCKED: car right beside you"},
         "b": {"your_lane": "lane 2 of 4 (counting from the left)", "your_speed": "25 m/s (allowed range 20-30)",
               "ahead_in_your_lane": "car close ahead (14 m), 4 m/s slower than you", "left_lane": "BLOCKED: car right beside you", "right_lane": "clear"}},
        {"why": "there is no lane to the right of the rightmost lane",
         "a": {"your_lane": "rightmost of 4 lanes", "your_speed": "25 m/s (allowed range 20-30)",
               "ahead_in_your_lane": "car close ahead (14 m), 4 m/s slower than you", "left_lane": "clear", "right_lane": "no lane (you are in the rightmost lane)"},
         "b": {"your_lane": "lane 2 of 4 (counting from the left)", "your_speed": "25 m/s (allowed range 20-30)",
               "ahead_in_your_lane": "car close ahead (14 m), 4 m/s slower than you", "left_lane": "clear", "right_lane": "clear"}},
    ],
    "snake": [
        {"why": "a wall straight ahead, or a clear run",
         "a": {"food": "5 cells straight ahead", "if_you_turn_left": "clear for 4 cells, then the wall",
               "if_you_go_straight": "BLOCKED: wall right next to you", "if_you_turn_right": "clear for 6 cells, then the wall", "your_length": "3 cells (0 food eaten)"},
         "b": {"food": "5 cells straight ahead", "if_you_turn_left": "clear for 4 cells, then the wall",
               "if_you_go_straight": "clear for 7 cells, then the wall", "if_you_turn_right": "clear for 6 cells, then the wall", "your_length": "3 cells (0 food eaten)"}},
        {"why": "food to the left, or food to the right",
         "a": {"food": "4 cells to your left", "if_you_turn_left": "clear for 5 cells, then the wall",
               "if_you_go_straight": "clear for 5 cells, then the wall", "if_you_turn_right": "clear for 5 cells, then the wall", "your_length": "3 cells (0 food eaten)"},
         "b": {"food": "4 cells to your right", "if_you_turn_left": "clear for 5 cells, then the wall",
               "if_you_go_straight": "clear for 5 cells, then the wall", "if_you_turn_right": "clear for 5 cells, then the wall", "your_length": "3 cells (0 food eaten)"}},
        {"why": "every turn is fatal except one",
         "a": {"food": "3 cells to your right", "if_you_turn_left": "BLOCKED: your own body right next to you",
               "if_you_go_straight": "clear for 4 cells, then the wall", "if_you_turn_right": "BLOCKED: wall right next to you", "your_length": "8 cells (5 food eaten)"},
         "b": {"food": "3 cells to your right", "if_you_turn_left": "clear for 4 cells, then your own body",
               "if_you_go_straight": "clear for 4 cells, then the wall", "if_you_turn_right": "clear for 3 cells, then the wall", "your_length": "8 cells (5 food eaten)"}},
    ],
}


def distance(a, b):
    """Total variation distance between two answers: 0 identical, 1 opposite."""
    options = set(a) | set(b)
    return round(sum(abs(a.get(o, 0.0) - b.get(o, 0.0)) for o in options) / 2, 3)


def probe_sensitivity(game_name, decide):
    game = make_game(game_name)
    pairs = []
    for pair in CONTRASTS[game_name]:
        pa = decide(pair["a"], game.questions)["action"]["probabilities"]
        pb = decide(pair["b"], game.questions)["action"]["probabilities"]
        pairs.append({"why": pair["why"], "moved": distance(pa, pb),
                      "a": {k: round(v, 3) for k, v in pa.items()}, "b": {k: round(v, 3) for k, v in pb.items()}})
    return {"sensitivity": round(sum(p["moved"] for p in pairs) / len(pairs), 3), "pairs": pairs}


def run_probes(games, deciders, out_dir):
    started = datetime.now(timezone.utc)
    out = {"started": started.isoformat(timespec="seconds"), "agents": {}}
    for name, decide in deciders.items():
        out["agents"][name] = {g: probe_sensitivity(g, decide) for g in games}
    path = Path(out_dir) / "probes" / f"{started.strftime('%Y%m%d-%H%M%S')}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=2))
    return path


def main():
    p = argparse.ArgumentParser(description="Measure how much each model's answer changes between opposite situations.")
    p.add_argument("--agents", nargs="+", default=MODELS)
    p.add_argument("--games", nargs="+", default=GAME_NAMES, choices=GAME_NAMES)
    p.add_argument("--out", default="results")
    p.add_argument("--laya-checkpoint", default="multilingual")
    args = p.parse_args()

    deciders = {}
    for name in args.agents:
        agent = make_agent(name, args.games[0], 0, args.laya_checkpoint) if name in MODELS else make_agent(name, args.games[0], 0)
        deciders[name] = agent.decide
    path = run_probes(args.games, deciders, args.out)
    saved = json.loads(path.read_text())
    for name, games in saved["agents"].items():
        print(name, " ".join(f"{g}: {r['sensitivity']}" for g, r in games.items()))
    print(f"Saved {path}")


if __name__ == "__main__":
    main()
