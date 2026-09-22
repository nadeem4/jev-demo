import type { GameId } from "./types";

// Shapes of the JSON written by arena.bench and arena.probe.
interface Metric { rate?: number; mean?: number }
interface Reference { matches: number; confidence_gap: number }
interface AgentResult { metrics: Record<string, Metric>; reference?: Reference; decisions: { latency_p50_ms: number | null; failed: number; retries: number } }
export interface Run { agents: Record<string, AgentResult> }
export type Results = Partial<Record<GameId, Run[]>>;
export interface Probes { agents: Record<string, Partial<Record<GameId, { sensitivity: number }>>> }

export interface ScoreRow {
  group: string;
  label: string;
  note: string;
  jev: string;
  laya: string;
  winner: "jev" | "laya" | "tie" | null;
}

const MODELS = ["jev", "laya"] as const;
type Model = (typeof MODELS)[number];

const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (x: number, digits = 2) => x.toFixed(digits);

/** Lower or higher wins; a difference too small to matter is a tie. */
function winner(values: Record<Model, number | null>, better: "higher" | "lower", tieWithin = 0): ScoreRow["winner"] {
  const { jev, laya } = values;
  if (jev === null || laya === null) return null;
  if (Math.abs(jev - laya) <= tieWithin) return "tie";
  const jevWins = better === "higher" ? jev > laya : jev < laya;
  return jevWins ? "jev" : "laya";
}

function row(group: string, label: string, note: string, values: Record<Model, number | null>,
             format: (x: number) => string, better: "higher" | "lower", tieWithin = 0): ScoreRow | null {
  if (values.jev === null || values.laya === null) return null;
  return { group, label, note, jev: format(values.jev), laya: format(values.laya), winner: winner(values, better, tieWithin) };
}

const agent = (results: Results, game: GameId, model: Model) => results[game]?.[0]?.agents?.[model];

function pick(results: Results, game: GameId, read: (a: AgentResult) => number | null | undefined): Record<Model, number | null> {
  const value = (m: Model) => {
    const a = agent(results, game, m);
    const v = a ? read(a) : null;
    return v === undefined || v === null ? null : v;
  };
  return { jev: value("jev"), laya: value("laya") };
}

/** Average across every game that has a number for this model. */
function across(models: Record<Model, number[]>): Record<Model, number | null> {
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return { jev: mean(models.jev), laya: mean(models.laya) };
}

function gather(results: Results, read: (a: AgentResult) => number | null | undefined) {
  const out: Record<Model, number[]> = { jev: [], laya: [] };
  for (const game of Object.keys(results) as GameId[]) {
    for (const m of MODELS) {
      const a = agent(results, game, m);
      const v = a ? read(a) : null;
      if (v !== null && v !== undefined) out[m].push(v);
    }
  }
  return out;
}

export function buildScorecard(results: Results, probes: Probes | null): ScoreRow[] {
  const sensitivity = across({
    jev: Object.values(probes?.agents?.jev ?? {}).map((g) => g.sensitivity),
    laya: Object.values(probes?.agents?.laya ?? {}).map((g) => g.sensitivity),
  });
  const totals = (key: "failed" | "retries") => across(gather(results, (a) => a.decisions[key]));
  const sum = (v: Record<Model, number | null>, count: number) =>
    ({ jev: v.jev === null ? null : v.jev * count, laya: v.laya === null ? null : v.laya * count });
  const games = Object.keys(results).length;

  return [
    row("Decisions", "Highway crash rate", "10 episodes, identical traffic",
        pick(results, "highway", (a) => a.metrics.crashed?.rate), pct, "lower"),
    row("Decisions", "Highway distance", "metres before crashing or finishing",
        pick(results, "highway", (a) => a.metrics.distance_m?.mean), (x) => `${Math.round(x)} m`, "higher"),
    row("Decisions", "Snake food eaten", "a greedy script eats about 17",
        pick(results, "snake", (a) => a.metrics.food_eaten?.mean), (x) => num(x, 1), "higher"),
    row("Decisions", "Blackjack: matches the best play", "against basic strategy, the known optimum",
        pick(results, "blackjack", (a) => a.reference?.matches), pct, "higher"),
    row("Understanding", "Reads the situation", "how far the answer moves between opposite situations (0 to 1)",
        sensitivity, (x) => num(x), "higher"),
    row("Understanding", "Confidence matches being right", "average gap between stated confidence and being right; lower is better",
        across(gather(results, (a) => a.reference?.confidence_gap)), (x) => num(x), "lower"),
    row("Engineering", "Decision time", "typical, as measured here: Jev over the network, Laya on CPU",
        across(gather(results, (a) => a.decisions.latency_p50_ms)), (x) => `${Math.round(x)} ms`, "lower"),
    row("Engineering", "Failed decisions", `across ${games} games`, sum(totals("failed"), games), (x) => String(Math.round(x)), "lower"),
    row("Engineering", "Rate-limit retries", "waiting for the provider", sum(totals("retries"), games), (x) => String(Math.round(x)), "lower"),
    { group: "Engineering", label: "Cost", note: "at these volumes", jev: "$0.042 per million tokens", laya: "Free, your hardware", winner: "laya" },
    { group: "Engineering", label: "Control", note: "can you run and change it", jev: "Closed API", laya: "Open weights, offline, fine-tunable", winner: "laya" },
  ].filter(Boolean) as ScoreRow[];
}
