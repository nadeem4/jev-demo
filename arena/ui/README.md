# Arena UI

A Next.js app with three pages, backed by the Python arena server (see [../README.md](../README.md)):

- **Arena** (`/`): pick a game and two agents, then watch them play the same seed side by side, live or from a recording.
- **Results** (`/results/`): the latest benchmark per game, with 95% intervals.
- **Learn** (`/learn/`): how Jev and Laya work, with diagrams and sources.

```
npm install
npm run dev      # http://localhost:3000
npm test         # Vitest: playback, game config, insights, highway drawing
npm run build    # static site in out/
```

The app is fully client-side, so `next build` produces a static export (`output: "export"`, `trailingSlash: true`). In Docker it's served by nginx (see `Dockerfile`), and any static host can serve it.

## Arena layout

The boards sit in the middle and each agent's panel on its outer side: "What it sees" (the exact text the model read) above "What it decides" (a probability for each option). Warnings appear when a move is impossible or blocked, when it disagrees with blackjack's basic strategy, or when the model was under 50% confident. On narrow screens the boards come first.

## Code

- `lib/games.tsx`: everything the UI knows about each game (agents, options with labels and icons, how to order the state, stats under the board, and Results metrics). Adding a game starts here.
- `lib/playback.ts`: plays one decision per step, whatever speed events arrive at, and holds until both sides are ready. It hands each game the previous frame, the next frame and the progress between them.
- `lib/draw/`: canvas drawing for Highway (`highway.ts`, with smooth car motion) and Snake (`snake.ts`). Blackjack is plain markup in `components/blackjack-board.tsx`.
- `lib/insights.ts`: per-game warnings about a decision.
- `components/arena.tsx`, `model-panel.tsx`, `results.tsx`, `mermaid.tsx`, `site-nav.tsx`: the pages' building blocks. Mermaid diagrams are black and white on white.
- `lib/api.ts`: the arena server URL. Defaults to `http://localhost:8000`; override it with `NEXT_PUBLIC_ARENA_API` at build time.

Styling uses Tailwind v4 tokens in `app/globals.css`, with sign green as the only accent and light and dark themes. Type is Overpass, via `next/font`. Icons come from Phosphor, and bar animations use Motion, which respects reduced-motion settings. `lodash-es` is pinned to 4.18.1 through `overrides`, because Mermaid's parser still pulls a vulnerable 4.17.
