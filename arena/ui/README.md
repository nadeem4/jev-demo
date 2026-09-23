# Arena UI

A Next.js app with three pages, backed by the Python arena server (see [../README.md](../README.md)):

- **Arena** (`/`): pick a game and two agents, then watch them play the same seed, one model at a time, live or from a recording.
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

Each model runs its own environment instance: its own traffic, deck or food layout, its own episode, sharing only the seed. They never interact, so the page shows **one model at a time**, picked by a tab, and everything on screen belongs to that model.

- **Model tabs**: one button per model (`Jev` / `Laya`), the current one pressed, styled like the game tabs in the header. Switching tabs keeps the decision you are on — decision 12 of Jev becomes decision 12 of Laya — because that side-by-side reading of the same decision is the comparison. Both episodes keep playing underneath; the tab only selects what is displayed. If the other model has no decision at that index, it says so ("It made no decision 26; its episode ended at 16.") rather than showing a different one.
- **Comparison ribbon**: a thin, static strip below the tabs, on every tab, naming both models with their standing and the game's headline measure — `Jev · driving · 267 m`, `Laya · crashed at 16 · 196 m` — on one shared scale (metres travelled, food eaten, hands won). It never hides, so a visitor who never switches tabs still sees both.
- **The selected model**, full width: its name, the decision number, latency and retries; its board with the game's stats on the left; and on the right the move it played with a confidence bar and percentage, any warnings, the call-failed line, how it split the options, the plain-language state it read before deciding, and the end-of-episode line.
- **The raw exchange** for the same model, full width: `REQUEST · state` and `RESPONSE`, straight from the recording, with the played move highlighted. The rest of the request — the `questions` object from the `start` event, the instructions and every option's criteria, identical on every call — is collapsed at the foot of the request pane, and expands to the exact JSON with a copy button.
- **Earlier decisions** stays paired: every decision so far, newest first, both models on one row, whatever tab is selected. Picking a row pins the whole page to that decision; "Follow the game again" resumes.

Warnings appear when a move is impossible or blocked, when it disagrees with blackjack's basic strategy, or when the model was under 50% confident. The toolbar's Playback controls pause, resume and step one decision either way. On narrow screens everything stacks in the same order: tabs, comparison ribbon, board, decision readout, raw exchange, earlier decisions.

Everything on the page comes from the recorded events; nothing about the request is reconstructed or paraphrased.

## Code

- `lib/games.tsx`: everything the UI knows about each game (agents, options with labels and icons, how to order the state, stats under the board, the headline measure for the comparison ribbon, and Results metrics). Adding a game starts here.
- `lib/playback.ts`: plays one decision per step, whatever speed events arrive at, and holds until both sides are ready. It hands each game the previous frame, the next frame and the progress between them, keeps every decision it has played, and can hand back any earlier one (`frameAt`).
- `lib/decisions.ts`: the pure logic behind the play page — the Earlier-decisions rows from two event streams, the `questions` half of the request from a `start` event, the shared comparison scale, and each model's standing (`driving`, `crashed at 16`) for the comparison ribbon.
- `lib/draw/`: canvas drawing for Highway (`highway.ts`, a horizontal road with smooth car motion) and Snake (`snake.ts`). Blackjack is plain markup in `components/blackjack-board.tsx`.
- `lib/insights.ts`: per-game warnings about a decision.
- `components/arena.tsx`, `model-band.tsx`, `exchange.tsx`, `decision-list.tsx`, `code.tsx`, `results.tsx`, `mermaid.tsx`, `site-nav.tsx`: the pages' building blocks. Mermaid diagrams are black and white on white.
- `lib/api.ts`: the arena server URL. Defaults to `http://localhost:8000`; override it with `NEXT_PUBLIC_ARENA_API` at build time.

Styling uses Tailwind v4 tokens in `app/globals.css`, with sign green as the only accent and light and dark themes. Type is Overpass, via `next/font`. Icons come from Phosphor, and bar animations use Motion, which respects reduced-motion settings. `lodash-es` is pinned to 4.18.1 through `overrides`, because Mermaid's parser still pulls a vulnerable 4.17.
