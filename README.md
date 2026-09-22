# Jev Demos

Demos built on [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), TypeSafe AI's System One decision model, and [Laya](https://github.com/NandhaKishorM/laya), an open-source alternative.

## Setup

Put your Jev key in `.env` at the repo root. All demos share it.

```
AI_GATEWAY_API_KEY=your_key       # Vercel AI Gateway (typesafe-ai/jev)
TYPESAFE_API_KEY=your_key         # optional: TypeSafe's API directly, preferred when set
```

The Vercel account needs a credit card on file before AI Gateway will serve requests.

## Demos

| Folder | What it does |
|---|---|
| [arena](arena/) | Jev vs open-source Laya (plus baselines) driving highway-env with zero training. Watch them side by side, live or from recordings |
| [agent-watchdog](agent-watchdog/) | Supervises Claude Code: scores every tool call for reversibility, scope drift, prompt injection, and looping before it runs |

## Quick start

### Arena: watch Jev and Laya drive

Needs [uv](https://docs.astral.sh/uv/). The first run downloads Laya's model, about 2.3 GB.

```
cd arena
uv sync
uv run python -c "from huggingface_hub import snapshot_download; snapshot_download('convaiinnovations/laya', local_dir='models/laya')"
uv run python -m arena.server
```

Open http://localhost:8000, choose the models and traffic, and click **Play**. To record episodes, run tests, or learn how it works, see [arena/README.md](arena/README.md).

### Agent watchdog

Needs Node.js 22+.

```
cd agent-watchdog
npm install
node scripts/smoke-test.mjs      # checks Jev access
npm test
```

Then register the hook in the project you want watched; see [agent-watchdog/README.md](agent-watchdog/README.md).
