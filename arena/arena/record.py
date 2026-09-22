"""Records single episodes to JSON:

    uv run python -m arena.record --game highway --agent jev --episodes 3

For benchmarks with statistics across many episodes, use arena.bench.
"""
import argparse
import json
from pathlib import Path

from .agents import MODELS, make_agent
from .games import GAME_NAMES, GAMES
from .runner import run_episode


def record_episode(game, agent, seed, out_dir, max_steps=None):
    events = list(run_episode(game, agent, seed=seed, max_steps=max_steps))
    path = Path(out_dir) / game / agent.name / f"seed-{seed}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(events))
    return path


def main():
    all_agents = sorted(set(MODELS).union(*(g.baselines for g in GAMES.values())))
    p = argparse.ArgumentParser(description="Record episodes for one agent.")
    p.add_argument("--game", default="highway", choices=GAME_NAMES)
    p.add_argument("--agent", required=True, choices=all_agents)
    p.add_argument("--episodes", type=int, default=3)
    p.add_argument("--seed-start", type=int, default=0)
    p.add_argument("--max-steps", type=int, default=None)
    p.add_argument("--out", default="runs")
    p.add_argument("--laya-checkpoint", default=None, help="e.g. multilingual, typed-decisions. Weights folder: LAYA_PATH (default models/laya)")
    args = p.parse_args()

    agent = make_agent(args.agent, args.game, args.seed_start, args.laya_checkpoint)
    for seed in range(args.seed_start, args.seed_start + args.episodes):
        events = json.loads(record_episode(args.game, agent, seed, args.out, args.max_steps).read_text())
        errors = sum("error" in e for e in events)
        print(f"seed {seed}: {events[-1]}" + (f"  ({errors} failed decisions)" if errors else ""))


if __name__ == "__main__":
    main()
