"""Benchmarks: every agent plays the same seeds, and results get confidence intervals.

    uv run python -m arena.bench --game highway --agents jev laya idle random --episodes 20

Each episode is also saved as a recording (runs/<game>/<agent>/seed-N.json) so it
can be replayed in the UI, and saved episodes are reused, so a stopped run resumes
(--fresh replays everything). Results go to results/<game>/<timestamp>.json.
"""
import argparse
import json
import math
import statistics
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from . import agents as agents_mod
from .agents import MODELS, agent_names, make_agent
from .games import GAME_NAMES
from .runner import run_episode

Z = 1.96  # 95%
# Two-sided 95% t critical values for small samples (df = n - 1); 1.96 beyond 30.
T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131,
       2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042]


def wilson(successes, n):
    """95% Wilson score interval for a rate; well-behaved for small n and 0% / 100%."""
    p = successes / n
    denom = 1 + Z**2 / n
    center = (p + Z**2 / (2 * n)) / denom
    half = Z * math.sqrt(p * (1 - p) / n + Z**2 / (4 * n**2)) / denom
    return max(0.0, center - half), min(1.0, center + half)


def mean_ci(values):
    """Mean with a 95% t-interval. One value has no interval."""
    mean = statistics.fmean(values)
    if len(values) < 2:
        return mean, None, None
    t = T95[len(values) - 2] if len(values) - 1 <= len(T95) else Z
    half = t * statistics.stdev(values) / math.sqrt(len(values))
    return mean, mean - half, mean + half


def _r(x, digits=3):
    return None if x is None else round(x, digits)


def aggregate(episodes):
    """Summarizes episodes (lists of events) for one agent."""
    ends = [ep[-1] for ep in episodes]
    metrics = {}
    for key in ends[0]:
        if key == "type":
            continue
        values = [e[key] for e in ends]
        if all(isinstance(v, bool) for v in values):
            low, high = wilson(sum(values), len(values))
            metrics[key] = {"rate": _r(sum(values) / len(values)), "ci95": [_r(low), _r(high)]}
        elif all(isinstance(v, (int, float)) for v in values):
            mean, low, high = mean_ci([float(v) for v in values])
            if low is not None and min(values) >= 0:
                low = max(0.0, low)  # counts and distances can't be negative
            metrics[key] = {"mean": _r(mean), "ci95": [_r(low), _r(high)]}

    steps = [e for ep in episodes for e in ep if e["type"] == "step"]
    latencies = [s["latency_ms"] for s in steps]
    confidences = [s["answers"]["action"]["probabilities"].get(s["action"], 0.0) for s in steps if s.get("answers")]
    return {
        "episodes": len(episodes),
        "metrics": metrics,
        "decisions": {
            "count": len(steps),
            "failed": sum("error" in s for s in steps),
            "retries": sum(s.get("retries", 0) for s in steps),
            "latency_p50_ms": _r(statistics.median(latencies), 1) if latencies else None,
            "latency_p95_ms": _r(statistics.quantiles(latencies, n=20)[18], 1) if len(latencies) >= 2 else None,
            "avg_confidence": _r(statistics.fmean(confidences)) if confidences else None,
        },
    }


def _git_commit():
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    except Exception:
        return None


def usable_device(torch):
    """The GPU can be visible but unusable (e.g. an old NVIDIA driver); only report
    "cuda" if running on it actually works, which is when Laya uses it."""
    if not torch.cuda.is_available():
        return "cpu"
    try:
        torch.zeros(1, device="cuda")
        return "cuda"
    except Exception:
        return "cpu"


def _model_info(names, laya_checkpoint):
    info = {}
    if "jev" in names:
        info["jev"] = {"provider": "typesafe" if agents_mod.jev._key("TYPESAFE_API_KEY") else "gateway",
                       "model": agents_mod.jev.TYPESAFE_MODEL}
    if "laya" in names:
        import torch
        info["laya"] = {"checkpoint": laya_checkpoint or "english", "device": usable_device(torch)}
    return info


def run_benchmark(game, names, seeds, out_dir, max_steps=None, make=None, laya_checkpoint=None, log=lambda *_: None, fresh=False):
    """Episodes already saved in runs/ are reused unless fresh=True, so a stopped
    run resumes where it left off. Results are rewritten after every agent."""
    out_dir = Path(out_dir)
    make = make or (lambda name, g, seed: make_agent(name, g, seed, laya_checkpoint))
    started = datetime.now(timezone.utc)
    results = {"game": game, "seeds": list(seeds), "max_steps": max_steps, "started": started.isoformat(timespec="seconds"),
               "commit": _git_commit(), "models": _model_info(names, laya_checkpoint), "agents": {}}
    results_path = out_dir / "results" / game / f"{started.strftime('%Y%m%d-%H%M%S')}.json"

    for name in names:
        cached = None
        episodes = []
        for seed in seeds:
            path = out_dir / "runs" / game / name / f"seed-{seed}.json"
            if path.exists() and not fresh:
                events = json.loads(path.read_text())
                log(f"{game} {name} seed {seed}: reused saved episode")
            else:
                if name in MODELS:
                    cached = cached or make(name, game, seed)  # load Jev / Laya once
                    agent = cached
                else:
                    agent = make(name, game, seed)  # baselines are seeded per episode
                events = list(run_episode(game, agent, seed=seed, max_steps=max_steps))
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(json.dumps(events))
                log(f"{game} {name} seed {seed}: {events[-1]}")
            episodes.append(events)
        results["agents"][name] = aggregate(episodes)
        results["finished"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        results_path.parent.mkdir(parents=True, exist_ok=True)
        results_path.write_text(json.dumps(results, indent=2))

    results["path"] = results_path
    return results


def _table(results):
    rows = []
    for name, s in results["agents"].items():
        m, d = s["metrics"], s["decisions"]
        cells = [name, str(s["episodes"])]
        for key, v in m.items():
            if "rate" in v:
                cells.append(f"{key} {v['rate']:.0%} [{v['ci95'][0]:.0%}-{v['ci95'][1]:.0%}]")
            elif key != "steps":
                ci = v["ci95"]
                cells.append(f"{key} {v['mean']:g}" + (f" [{ci[0]:g}-{ci[1]:g}]" if ci[0] is not None else ""))
        cells.append(f"p50 {d['latency_p50_ms']} ms, conf {d['avg_confidence']}, failed {d['failed']}, retries {d['retries']}")
        rows.append(" | ".join(cells))
    return "\n".join(rows)


def main():
    p = argparse.ArgumentParser(description="Benchmark agents on one game over shared seeds.")
    p.add_argument("--game", default="highway", choices=GAME_NAMES)
    p.add_argument("--agents", nargs="+", default=None, help="default: every agent for the game")
    p.add_argument("--episodes", type=int, default=20)
    p.add_argument("--seed-start", type=int, default=0)
    p.add_argument("--max-steps", type=int, default=None)
    p.add_argument("--out", default=".")
    p.add_argument("--laya-checkpoint", default="multilingual")
    p.add_argument("--fresh", action="store_true", help="replay every episode instead of reusing saved ones")
    args = p.parse_args()

    names = args.agents or agent_names(args.game)
    seeds = list(range(args.seed_start, args.seed_start + args.episodes))
    results = run_benchmark(args.game, names, seeds, args.out, args.max_steps, laya_checkpoint=args.laya_checkpoint, log=print, fresh=args.fresh)
    print(_table(results))
    print(f"Saved {results['path']}")


if __name__ == "__main__":
    main()
