"""Exports recordings and benchmark results as static JSON for the published site:

    uv run python -m arena.export          # writes ui/public/data/

The site then replays recordings and shows results without the arena server.
Files mirror the API: runs.json (index), results.json, runs/<game>/<agent>/seed-N.json.
"""
import argparse
import json
import shutil
from pathlib import Path

from .server import list_results, list_runs


def export_site(runs_dir, results_dir, out_dir):
    runs_dir, out_dir = Path(runs_dir), Path(out_dir)
    if out_dir.exists():
        shutil.rmtree(out_dir)  # a replaced export must not keep stale recordings
    out_dir.mkdir(parents=True)
    if runs_dir.is_dir():
        shutil.copytree(runs_dir, out_dir / "runs")
    (out_dir / "runs.json").write_text(json.dumps(list_runs(runs_dir)))
    (out_dir / "results.json").write_text(json.dumps(list_results(results_dir)))


def main():
    p = argparse.ArgumentParser(description="Export recordings and results for the static site.")
    p.add_argument("--runs", default="runs")
    p.add_argument("--results", default="results")
    p.add_argument("--to", default="ui/public/data")
    args = p.parse_args()
    export_site(args.runs, args.results, args.to)
    index = json.loads((Path(args.to) / "runs.json").read_text())
    count = sum(len(seeds) for agents in index.values() for seeds in agents.values())
    print(f"Exported {count} recordings and results for {', '.join(index) or 'no games'} to {args.to}")


if __name__ == "__main__":
    main()
