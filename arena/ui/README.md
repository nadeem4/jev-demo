# Arena UI

A Next.js app with three pages, backed by the Python arena server (see [../README.md](../README.md)):

- **Arena** (`/`): pick a game and two agents, then watch them play the same seed side by side, live or from a recording.
- **Results** (`/results/`): the latest benchmark per game, with 95% intervals.
- **Learn** (`/learn/`): how Jev and Laya work, with diagrams and sources.

```
npm install
npm run dev      # http://localhost:3000
npm test         # Vitest: playback, decisions, game config, insights, highway drawing
npm run build    # static site in out/, reading from the arena server
npm run preview:static   # the published site: static data, no server, on http://localhost:4000
```

`preview:static` builds with `NEXT_PUBLIC_SITE_MODE=static`, so the site reads `public/data/` instead of the arena server: recorded games, results and Learn, but no live play. Refresh that data first with `uv run python -m arena.export` in the arena folder.

The app is fully client-side, so `next build` produces a static export (`output: "export"`, `trailingSlash: true`). In Docker it's served by nginx (see `Dockerfile`), and any static host can serve it.

## Arena layout

One band per model, both in the same order everywhere (first model on top, second below), nothing mirrored. Two columns on wide screens:

- **Left rail**: one band per model, each self-contained — the model's name, the decision number and latency, the move it played with a confidence bar and percentage, any warnings; then that model's own board directly beneath, with the game's stats; then the denser reading under it, how the model split the options and the plain-language state it read, and the end-of-episode line. After both bands, a comparison strip putting both models on one scale for the game's headline measure (metres travelled, food eaten, hands won) — it belongs to neither model, so it sits at the foot of the rail.
- **Right column**: one raw exchange per model (`REQUEST · state` and `RESPONSE`, straight from the recording, with the played move highlighted). The rest of the request — the `questions` object from the `start` event, the instructions and every option's criteria, identical on every call — is collapsed at the foot of the request pane, and expands to the exact JSON with a copy button. Then **Earlier decisions**: every decision so far, newest first, both models on one row. Picking a row pins the whole page to that decision; "Follow the game again" resumes.

Warnings appear when a move is impossible or blocked, when it disagrees with blackjack's basic strategy, or when the model was under 50% confident. The toolbar's Playback controls pause, resume and step one decision either way. On narrow screens everything stacks in the same order: first model's band, second model's band, the comparison strip, the two exchanges, earlier decisions.

Everything on the page comes from the recorded events; nothing about the request is reconstructed or paraphrased.

## Code

- `lib/games.tsx`: everything the UI knows about each game (agents, options with labels and icons, how to order the state, stats under the board, the headline measure for the comparison strip, and Results metrics). Adding a game starts here.
- `lib/playback.ts`: plays one decision per step, whatever speed events arrive at, and holds until both sides are ready. It hands each game the previous frame, the next frame and the progress between them, keeps every decision it has played, and can hand back any earlier one (`frameAt`).
- `lib/decisions.ts`: the pure logic behind the play page — the Earlier-decisions rows from two event streams, the `questions` half of the request from a `start` event, and the shared comparison scale.
- `lib/draw/`: canvas drawing for Highway (`highway.ts`, a horizontal road with smooth car motion) and Snake (`snake.ts`). Blackjack is plain markup in `components/blackjack-board.tsx`.
- `lib/insights.ts`: per-game warnings about a decision.
- `components/arena.tsx`, `model-band.tsx`, `exchange.tsx`, `decision-list.tsx`, `code.tsx`, `results.tsx`, `mermaid.tsx`, `site-nav.tsx`: the pages' building blocks. Mermaid diagrams are black and white on white.
- `lib/api.ts`: the arena server URL. Defaults to `http://localhost:8000`; override it with `NEXT_PUBLIC_ARENA_API` at build time.

Styling uses Tailwind v4 tokens in `app/globals.css`, with sign green as the only accent and light and dark themes. Type is Overpass, via `next/font`. Icons come from Phosphor, and bar animations use Motion, which respects reduced-motion settings. `lodash-es` is pinned to 4.18.1 through `overrides`, because Mermaid's parser still pulls a vulnerable 4.17.
