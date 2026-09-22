# Jev Demos

Demos built on [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), TypeSafe AI's System One model, called through Vercel AI Gateway (`typesafe-ai/jev`).

## Setup

Put your AI Gateway key in `.env` at the repo root (shared by all demos):

```
AI_GATEWAY_API_KEY=your_key
```

The Vercel account needs a credit card on file for AI Gateway to serve requests.

## Demos

| Folder | What it does |
|---|---|
| [arena](arena/) | Benchmark: Jev vs open-source Laya (and baselines) driving highway-env with zero training; records episodes for replay |
| [agent-watchdog](agent-watchdog/) | Supervises Claude Code: scores every tool call for reversibility, scope drift, prompt injection, and looping before it runs |
