# Arena UI

A Next.js app with three pages, backed by the Python arena server (see [../README.md](../README.md)):

- **Arena** (`/`): pick a game and two agents, then watch both play the same seed at once, live or from a recording.
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

## What the play page must show

The point of this page is comparing two models on the same situation, so these five things are visible **at the same time**, with no tab to switch and without scrolling away from the boards on a desktop viewport. Measure any change to the layout against this list:

1. Both models' current move, confidence and latency.
2. **Every option with its probability, for both models**, with the played option clearly marked.
3. Both game boards.
4. The raw request and response for both models.
5. The paired decision history.

## Arena layout

Each model runs its own environment instance: its own traffic, deck or food layout, its own episode, sharing only the seed. They never interact, but they are always on screen together, because the comparison *is* the page. Nothing is mirrored: both models read in the same direction, in the same order, everywhere.

Two columns from 1024px up — a narrower left column of models and boards, a wider right column of what they weighed and the wire.

- **Left column, one unit per model** (first model above second): its name, the decision number, latency and retries; the move it played, large, with a confidence bar and percentage; any warnings; the call-failed line; then **its own board directly beneath**, with the game's stats, and the end-of-episode line for that model.
- **Comparison ribbon** at the foot of the left column: both models with their standing and the game's headline measure — `Jev · driving · 267 m`, `Laya · crashed at 16 · 196 m` — on one shared scale (metres travelled, food eaten, hands won).
- **Right column, one block per model**, in the same order as the left. Each block opens with **how it split the options**: every option the game offers, in the game's order, with a bar and a percentage, the played one marked `· played`. An option the model gave no probability still appears, with `–`, and a failed call still marks the fallback move the game played. Directly beneath sits **the raw exchange**: `REQUEST · state` and `RESPONSE`, straight from the recording, with the played move highlighted. The rest of the request — the `questions` object from the `start` event, the instructions and every option's criteria, identical on every call — is collapsed at the foot of the request pane, and expands to the exact JSON with a copy button.
- **Earlier decisions** closes the right column: every decision so far, newest first, both models on one row. Picking a row pins the whole page to that decision, both models at once; "Follow the game again" resumes. A model whose episode ended earlier says so ("It made no decision 40; its episode ended at 16.") rather than repeating its last decision.

The plain-language state reading is not paraphrased beside the board: the `REQUEST · state` pane on the right is the same content, unparaphrased, and one copy of it keeps the page readable.

Warnings appear when a move is impossible or blocked, when it disagrees with blackjack's basic strategy, or when the model was under 50% confident. The toolbar's Playback controls pause, resume and step one decision either way. Below 1024px everything stacks in one column: first model (readout, board), second model (readout, board), the ribbon, then first model's options and raw exchange, the second model's, and earlier decisions.

Everything on the page comes from the recorded events; nothing about the request is reconstructed or paraphrased.

## Code

- `lib/games.tsx`: everything the UI knows about each game (agents, options with labels and icons, how to order the state, stats under the board, the headline measure for the comparison ribbon, and Results metrics). Adding a game starts here.
- `lib/playback.ts`: plays one decision per step, whatever speed events arrive at, and holds until both sides are ready. It hands each game the previous frame, the next frame and the progress between them, keeps every decision it has played, and can hand back any earlier one (`frameAt`).
- `lib/decisions.ts`: the pure logic behind the play page — the Earlier-decisions rows from two event streams, every option with the probability the model gave it (`optionShares`, which keeps options the model never scored), the `questions` half of the request from a `start` event, the shared comparison scale, and each model's standing (`driving`, `crashed at 16`) for the comparison ribbon.
- `lib/draw/`: canvas drawing for Highway (`highway.ts`, a horizontal road with smooth car motion) and Snake (`snake.ts`). Blackjack is plain markup in `components/blackjack-board.tsx`.
- `lib/insights.ts`: per-game warnings about a decision.
- `components/arena.tsx` (the two columns), `model-band.tsx` (one model's move and board), `exchange.tsx` (one model's option split and raw wire), `decision-list.tsx`, `code.tsx`, `results.tsx`, `mermaid.tsx`, `site-nav.tsx`: the pages' building blocks. Mermaid diagrams are black and white on white.
- `lib/api.ts`: the arena server URL. Defaults to `http://localhost:8000`; override it with `NEXT_PUBLIC_ARENA_API` at build time.

Styling uses Tailwind v4 tokens in `app/globals.css`, with sign green as the only accent and light and dark themes. Type is Overpass, via `next/font`. Icons come from Phosphor, and bar animations use Motion, which respects reduced-motion settings. `lodash-es` is pinned to 4.18.1 through `overrides`, because Mermaid's parser still pulls a vulnerable 4.17.
