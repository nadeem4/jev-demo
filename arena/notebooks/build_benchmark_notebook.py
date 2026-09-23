"""Writes colab_benchmark.ipynb. Keeping the notebook generated from a script keeps
the long cell sources reviewable in git and easy to edit."""
import json
from pathlib import Path

def md(text):
    return {"cell_type": "markdown", "metadata": {}, "source": text.strip().splitlines(keepends=True)}


def code(text):
    return {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": text.strip().splitlines(keepends=True)}


CELLS = [
    md("""
# Decision Arena on a GPU

Jev (TypeSafe's closed API) and Laya (open source, running here on the GPU) play the same
games with zero training. This notebook runs the three experiments the laptop cannot:

1. **A fair speed test.** Laya on a T4 against Jev over the API.
2. **A full benchmark.** 50 episodes per agent per game instead of 10, so the confidence intervals are narrow enough to separate close results.
3. **A real-time round.** Every decision gets a deadline; answers that arrive late are not used, as in a real-time system.

**Before running:** set the runtime to a GPU (Runtime, Change runtime type, T4 GPU).
To include Jev, add your key as a Colab secret named `AI_GATEWAY_API_KEY` (the key icon in the
left sidebar) and give this notebook access. Without it, the notebook runs Laya and the
baselines only.
"""),
    md("## 1. Setup"),
    code("""
# Installs the arena and everything it needs (highway-env, Laya). Colab already has torch.
!pip install -q "arena @ git+https://github.com/nadeem4/jev-demo.git#subdirectory=arena"
"""),
    code("""
import torch
from arena.bench import usable_device

print("torch", torch.__version__)
print("GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "none")
print("Laya will run on:", usable_device(torch))
"""),
    code("""
# Jev's key (optional) and where Laya's weights live.
import os
os.environ["LAYA_PATH"] = "/content/models/laya"

try:
    from google.colab import userdata
    for name in ["AI_GATEWAY_API_KEY", "TYPESAFE_API_KEY"]:
        value = userdata.get(name)
        if value:
            os.environ[name] = value
except Exception:
    pass

from arena.agents import MODELS
HAS_JEV = bool(os.environ.get("AI_GATEWAY_API_KEY") or os.environ.get("TYPESAFE_API_KEY"))
AGENTS = list(MODELS) if HAS_JEV else ["laya"]
print("running:", AGENTS, "" if HAS_JEV else "(no Jev key found, Laya and baselines only)")
"""),
    code("""
# Downloads Laya's weights (2.3 GB) once, then loads the checkpoint onto the GPU.
import time
from arena.agents import laya

CHECKPOINT = "multilingual"   # or None for the English checkpoint, or "typed-decisions"
start = time.time()
agent = laya.load(os.environ["LAYA_PATH"], CHECKPOINT)
print(f"Laya loaded in {time.time() - start:.0f}s")
"""),
    md("""
## 2. Experiment 1: a fair speed test

Same situations, same questions, one at a time. Jev's time includes the network and any
rate-limit retries, which is what you would actually wait for in production.
"""),
    code("""
import statistics, time
from arena.agents import make_agent
from arena.games import make_game
from arena.probe import CONTRASTS

def latencies(decide, game_name, repeats=10):
    game = make_game(game_name)
    states = [pair["a"] for pair in CONTRASTS[game_name]]
    out = []
    for _ in range(repeats):
        for state in states:
            start = time.perf_counter()
            decide(state, game.questions)
            out.append((time.perf_counter() - start) * 1000)
    return out

speed = {}
for name in AGENTS:
    a = agent if name == "laya" else make_agent(name)
    rows = latencies(a.decide, "highway")
    speed[name] = {"median_ms": round(statistics.median(rows), 1),
                   "p95_ms": round(sorted(rows)[int(len(rows) * 0.95) - 1], 1),
                   "decisions": len(rows)}
    print(name, speed[name])
"""),
    md("""
## 3. Experiment 2: the full benchmark

Every agent plays the same seeds. Episodes already recorded are reused, so this cell can be
re-run after a disconnect and will continue where it stopped.

Jev is rate-limited: expect roughly an hour per game at 50 episodes. Lower `EPISODES`
for a quick pass.
"""),
    code("""
from arena.agents import agent_names
from arena.bench import run_benchmark, format_table
from arena.games import GAME_NAMES

EPISODES = 50
OUT = "/content/arena-results"

for game in GAME_NAMES:
    names = [n for n in agent_names(game) if n in AGENTS or n not in MODELS]
    print(f"=== {game}: {names}")
    results = run_benchmark(game, names, list(range(EPISODES)), OUT,
                            laya_checkpoint=CHECKPOINT, log=print)
    print(format_table(results))
"""),
    md("""
## 4. Experiment 3: the real-time round

Each decision gets a deadline. An answer that arrives later is not used and the game takes its
default move, exactly as a real-time system would. This is where Laya's speed can pay for
itself: on a GPU it answers in tens of milliseconds, while Jev answers over the network.
"""),
    code("""
DEADLINE_MS = 150
REALTIME_EPISODES = 20

for game in ["highway", "snake"]:
    names = [n for n in AGENTS]
    print(f"=== {game} with a {DEADLINE_MS} ms deadline")
    results = run_benchmark(game, names, list(range(REALTIME_EPISODES)), f"{OUT}/realtime",
                            laya_checkpoint=CHECKPOINT, log=print, deadline_ms=DEADLINE_MS)
    for name, summary in results["agents"].items():
        d = summary["decisions"]
        print(f"{name}: {d['late']} of {d['count']} decisions arrived too late "
              f"({d['late'] / max(d['count'], 1):.0%})")
    print(format_table(results))
"""),
    md("""
## 5. Does each model read the situation?

Pairs of opposite situations per game, where the right answer clearly differs. The score is how
far the answer moves between them: 0 means the same answer to both, 1 means completely different.
"""),
    code("""
import json
from pathlib import Path
from arena.probe import run_probes

deciders = {name: (agent if name == "laya" else make_agent(name)).decide for name in AGENTS}
path = run_probes(GAME_NAMES, deciders, OUT)
probes = json.loads(Path(path).read_text())
for name, games in probes["agents"].items():
    print(name, {g: r["sensitivity"] for g, r in games.items()})
"""),
    md("""
## 6. Take the results home

Downloads everything this notebook measured. To publish it on the site:

```
# in the repo, on your machine
cp -r arena-results/results/* arena/results/
cp -r arena-results/runs/* arena/runs/
cd arena && uv run python -m arena.export && cd ui && npm run deploy
```
"""),
    code("""
import json, shutil
from pathlib import Path

Path(OUT).mkdir(parents=True, exist_ok=True)
Path(f"{OUT}/speed.json").write_text(json.dumps(speed, indent=2))
shutil.make_archive("/content/arena-results", "zip", OUT)
print("zipped", Path("/content/arena-results.zip").stat().st_size // 1024, "KB")

try:
    from google.colab import files
    files.download("/content/arena-results.zip")
except Exception as e:
    print("download from the file browser on the left:", e)
"""),
]

NOTEBOOK = {
    "cells": CELLS,
    "metadata": {
        "accelerator": "GPU",
        "colab": {"provenance": [], "gpuType": "T4"},
        "kernelspec": {"display_name": "Python 3", "name": "python3"},
        "language_info": {"name": "python"},
    },
    "nbformat": 4,
    "nbformat_minor": 0,
}

if __name__ == "__main__":
    out = Path(__file__).with_name("colab_benchmark.ipynb")
    out.write_text(json.dumps(NOTEBOOK, indent=1), encoding="utf-8")
    print(f"wrote {out} ({len(CELLS)} cells)")
