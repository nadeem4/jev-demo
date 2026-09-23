import { GAMES } from "./games";
import type { Run } from "./scorecard";
import type { GameId } from "./types";

const MODELS = ["jev", "laya"];

export interface Verdict {
  metric: string;   // the deciding metric's label, lowercased
  winner: string;   // the best model
  value: string;    // its score, formatted
  tied: string[] | null;
  /** The best baseline, kept as context: the models are what this site compares. */
  reference: { id: string; value: string; beatsWinner: boolean } | null;
}

/** Who won a game among the models, by its deciding metric (the first Results metric). */
export function verdict(game: GameId, run: Run | undefined): Verdict | null {
  const info = GAMES[game];
  const spec = info.results[0];
  if (!run) return null;

  const defines = info.defines ?? [];  // agents that define the metric rather than compete on it
  const scored = Object.entries(run.agents)
    .filter(([id]) => !defines.includes(id))
    .map(([id, a]) => {
      const m = a.metrics[spec.key];
      const value = spec.kind === "rate" ? m?.rate : m?.mean;
      return value === undefined ? null : { id, value };
    })
    .filter((x): x is { id: string; value: number } => x !== null);

  const better = (a: number, b: number) => (spec.better === "higher" ? a > b : a < b);
  const format = (x: number) => (spec.kind === "rate" || spec.percent ? `${Math.round(x * 100)}%` : String(Number(x.toFixed(2))));
  const rank = (rows: typeof scored) => [...rows].sort((a, b) => (better(a.value, b.value) ? -1 : 1));

  const models = rank(scored.filter((r) => MODELS.includes(r.id)));
  const baselines = rank(scored.filter((r) => !MODELS.includes(r.id)));
  if (!models.length) return null;

  const top = models[0];
  const tied = models.filter((m) => m.value === top.value).map((m) => m.id);
  const best = baselines[0];

  return {
    metric: spec.label.toLowerCase(),
    winner: top.id,
    value: format(top.value),
    tied: tied.length > 1 ? tied : null,
    reference: best ? { id: best.id, value: format(best.value), beatsWinner: better(best.value, top.value) } : null,
  };
}
