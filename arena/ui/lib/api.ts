// Where the UI gets its data.
// - Locally (npm run dev, docker compose): the Python arena server, which also runs live games.
//   The browser talks to it directly: a dev proxy re-chunks server-sent-event streams and breaks them.
// - Published (NEXT_PUBLIC_SITE_MODE=static): JSON files exported by `python -m arena.export`
//   into public/data/. Recordings and results only; live play needs the server.

export const ARENA_API = process.env.NEXT_PUBLIC_ARENA_API ?? "http://localhost:8000";
export const STATIC_SITE = process.env.NEXT_PUBLIC_SITE_MODE === "static";

export function makeUrls(isStatic: boolean, api: string) {
  return isStatic
    ? {
        results: "/data/results.json",
        probes: "/data/probes.json",
        runsIndex: "/data/runs.json",
        run: (game: string, agent: string, seed: number) => `/data/runs/${game}/${agent}/seed-${seed}.json`,
        live: null,
      }
    : {
        results: `${api}/api/results`,
        probes: `${api}/api/probes`,
        runsIndex: `${api}/api/runs`,
        run: (game: string, agent: string, seed: number) => `${api}/api/runs/${game}/${agent}/${seed}`,
        live: (game: string, agent: string, seed: number) => `${api}/api/live?game=${game}&agent=${agent}&seed=${seed}`,
      };
}

export const urls = makeUrls(STATIC_SITE, ARENA_API);

export type RunsIndex = Record<string, Record<string, number[]>>;

/** Seeds recorded for both agents, so a replay always has two sides. */
export function commonSeeds(index: RunsIndex, game: string, a: string, b: string): number[] {
  const seeds = (agent: string) => new Set(index[game]?.[agent] ?? []);
  const other = seeds(b);
  return [...seeds(a)].filter((s) => other.has(s)).sort((x, y) => x - y);
}
