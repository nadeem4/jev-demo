// Shapes the recorded events for the play page: the decision list, the part of the
// request that never changes, and the shared scale under the bands.

import { concerns } from "./insights";
import type { EndEvent, GameId, StartEvent, StepEvent } from "./types";
import type { PanelView } from "./views";

export interface DecisionCell { action: string | null; confidence: number | null; warned: boolean }
export interface DecisionRow { t: number; cells: DecisionCell[] }

const EMPTY_CELL: DecisionCell = { action: null, confidence: null, warned: false };

function cellFor(game: GameId, step: StepEvent | undefined): DecisionCell {
  if (!step) return EMPTY_CELL;
  const p = step.answers?.action?.probabilities?.[step.action];
  return {
    action: step.action,
    confidence: p ?? null,
    warned: concerns(game, step.state, step.action, step.answers, step.frame).length > 0,
  };
}

/** One row per decision, both models side by side, newest first. */
export function decisionRows(game: GameId, histories: StepEvent[][]): DecisionRow[] {
  const ts = [...new Set(histories.flat().map((s) => s.t))].sort((a, b) => b - a);
  return ts.map((t) => ({ t, cells: histories.map((h) => cellFor(game, h.find((s) => s.t === t))) }));
}

export interface RequestQuestions {
  /** The `questions` object itself, exactly as recorded. */
  body: unknown;
  /** How the request pane names it, collapsed. */
  summary: string;
}

/** The half of the request that is identical on every call: the questions the model answers. */
export function questionsOf(start: StartEvent | null): RequestQuestions | null {
  const questions = start?.questions;
  if (!questions || typeof questions !== "object") return null;
  const count = start?.options?.length ?? 0;
  return {
    body: questions,
    summary: count
      ? `questions — the ${count} option${count === 1 ? "" : "s"}, identical on every call`
      : "questions — identical on every call",
  };
}

const LIVE_WORD: Record<GameId, string> = { highway: "driving", snake: "moving", blackjack: "playing" };

const ENDED_WORD: Record<GameId, (end: EndEvent) => string> = {
  highway: (end) => (end.crashed ? `crashed at ${end.steps}` : `drove all ${end.steps}`),
  snake: (end) => (end.died ? `died at ${end.steps}` : `survived ${end.steps}`),
  blackjack: () => "finished",
};

/** One model's headline state in its own episode, for the comparison ribbon. */
export function standing(game: GameId, view: PanelView): string {
  if (view.failed) return "did not run";
  if (view.end) return ENDED_WORD[game](view.end);
  if (view.step) return LIVE_WORD[game];
  return view.started ? "starting" : "not started";
}

/** Puts every model's headline measure on one scale, so the bars can be read against each other. */
export function compareBars(values: (number | null)[]): { value: number | null; fraction: number }[] {
  const max = Math.max(0, ...values.map((v) => v ?? 0));
  return values.map((value) => ({ value, fraction: max > 0 ? Math.max(0, (value ?? 0) / max) : 0 }));
}
