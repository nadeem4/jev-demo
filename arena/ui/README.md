# Arena UI

A Next.js app for watching two decision models drive the same highway traffic side by side. It needs the Python arena server running (see [../README.md](../README.md)).

```
npm install
npm run dev      # http://localhost:3000
npm test         # Vitest: playback, insights, geometry
npm run build    # static site in out/
```

The app is fully client-side, so `next build` produces a static export (`output: "export"`). In Docker it's served by nginx (see `Dockerfile`), and any static host can serve it.

## Layout

The two roads are drawn on canvas in the middle. Each model's panel sits on its outer side, with "What it sees" (the road description the model read) above "What it decides" (a probability for each move). On narrow screens the roads come first and the panels stack below them.

## Code

- `components/arena.tsx`: the controls, the event streams (live over server-sent events, or a recording fetched as JSON), and one animation loop for both roads.
- `components/model-panel.tsx`: what the model saw and decided, plus warnings.
- `lib/playback.ts`: plays one decision per second whatever speed events arrive at, interpolates car positions, and holds until both roads are ready.
- `lib/insights.ts`: flags impossible moves, blocked lanes, and low-confidence decisions.
- `lib/geometry.ts` and `lib/draw.ts`: the vertical road drawing.
- `lib/api.ts`: the arena server URL. Defaults to `http://localhost:8000`; override it with `NEXT_PUBLIC_ARENA_API` (at build time for the static export).

Styling uses Tailwind v4 tokens in `app/globals.css`, with sign green as the only accent and light and dark themes. Type is Overpass, via `next/font`. Icons come from Phosphor, and bar animations use Motion, which respects reduced-motion settings.
