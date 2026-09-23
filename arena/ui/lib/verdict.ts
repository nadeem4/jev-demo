import { GAMES } from "./games";
import type { Run } from "./scorecard";
import type { GameId } from "./types";

const MODELS = ["jev", "laya"];

export interface Verdict {
  metric: string;          // the deciding metric's label
  winner: string;          // agent id
  value: string;           // the winner's score, formatted
  winnerIsModel: boolean;  // false when a baseline won, which is worth saying out loud
  bestModel: string | null;
  bestModelValue: string | null;
  tied: string[] | null;
}

/** Who won a game, by its deciding metric: the first metric in the game's Results list. */
export function verdict(game: GameId, run: Run | undefined): Verdict | null {
  const spec = GAMES[game].results[0];
  if (!run) return null;

  const defines = GAMES[game].defines ?? [];
  const scored = Object.entries(run.agents)
    .filter(([id]) => !defines.includes(id))
    .map(([id, a]) => {
      const m = a.metrics[spec.key];
      const value = spec.kind === "rate" ? m?.rate : m?.mean;
      return value === undefined ? null : { id, value };
    })
    .filter((x): x is { id: string; value: number } => x !== null);
  if (!scored.length) return null;

  const better = (a: number, b: number) => (spec.better === "higher" ? a > b : a < b);
  const format = (x: number) => (spec.kind === "rate" || spec.percent ? `${Math.round(x * 100)}%` : String(Number(x.toFixed(2))));
  const ranked = [...scored].sort((a, b) => (better(a.value, b.value) ? -1 : 1));
  const top = ranked[0];
  const tied = ranked.filter((r) => r.value === top.value).map((r) => r.id);
  const bestModel = ranked.find((r) => MODELS.includes(r.id)) ?? null;

  return {
    metric: spec.label.toLowerCase(),
    winner: top.id,
    value: format(top.value),
    winnerIsModel: MODELS.includes(top.id),
    bestModel: bestModel?.id ?? null,
    bestModelValue: bestModel ? format(bestModel.value) : null,
    tied: tied.length > 1 ? tied : null,
  };
}
