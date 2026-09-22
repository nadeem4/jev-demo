"""Records episodes to JSON and runs benchmarks from the command line:

    uv run python -m arena.record --agent jev --episodes 3
"""
import argparse
import json
import statistics
from pathlib import Path

from .agents import ConstantAgent, JevAgent, LayaAgent, RandomAgent
from .highway.runner import run_episode

ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


def record_episode(agent, seed, out_dir, max_steps=None):
    events = list(run_episode(agent, seed=seed, max_steps=max_steps))
    path = Path(out_dir) / events[0]["game"] / agent.name / f"seed-{seed}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(events))
    return path


def summarize(ends, latencies):
    n = len(ends)
    mean = lambda key: round(sum(e[key] for e in ends) / n, 2)
    return {
        "episodes": n,
        "crash_rate": round(sum(e["crashed"] for e in ends) / n, 3),
        "avg_distance_m": mean("distance_m"),
        "avg_reward": mean("total_reward"),
        "avg_speed": mean("avg_speed"),
        "latency_p50_ms": round(statistics.median(latencies), 1) if latencies else None,
    }


def _api_key():
    import os
    if key := os.environ.get("AI_GATEWAY_API_KEY"):
        return key
    line = next(l for l in ROOT_ENV.read_text().splitlines() if l.startswith("AI_GATEWAY_API_KEY"))
    return line.split("=", 1)[1].strip()


def make_agent(name, seed=0, laya_path="models/laya", laya_checkpoint=None):
    if name == "jev":
        return JevAgent(api_key=_api_key())
    if name == "laya":
        return LayaAgent.load(laya_path, laya_checkpoint)
    if name == "idle":
        return ConstantAgent("IDLE")
    if name == "random":
        return RandomAgent(seed)
    raise ValueError(f"unknown agent: {name}")


def main():
    p = argparse.ArgumentParser(description="Record highway episodes for one agent.")
    p.add_argument("--agent", required=True, choices=["jev", "laya", "idle", "random"])
    p.add_argument("--episodes", type=int, default=3)
    p.add_argument("--seed-start", type=int, default=0)
    p.add_argument("--max-steps", type=int, default=None)
    p.add_argument("--out", default="runs")
    p.add_argument("--laya-path", default="models/laya")
    p.add_argument("--laya-checkpoint", default=None, help="e.g. multilingual, typed-decisions")
    args = p.parse_args()

    agent = make_agent(args.agent, args.seed_start, args.laya_path, args.laya_checkpoint)
    ends, latencies = [], []
    for seed in range(args.seed_start, args.seed_start + args.episodes):
        path = record_episode(agent, seed, args.out, args.max_steps)
        events = json.loads(path.read_text())
        ends.append(events[-1])
        latencies += [e["latency_ms"] for e in events if e["type"] == "step"]
        errors = sum("error" in e for e in events)
        print(f"seed {seed}: {events[-1]}" + (f"  ({errors} failed decisions)" if errors else ""))
    print(json.dumps(summarize(ends, latencies), indent=2))


if __name__ == "__main__":
    main()
