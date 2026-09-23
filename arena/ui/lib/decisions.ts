// Shapes the recorded events for the play page: the decision list, the part of the
// request that never changes, and the shared scale under the boards.

import { concerns } from "./insights";
import type { GameId, StartEvent, StepEvent } from "./types";

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

export interface Envelope {
  /** The instructions sent with every decision, one per question. */
  instructions: string[];
  /** What each option means, exactly as recorded. */
  criteria: { id: string; text: string }[];
  /** The `questions` object itself, for the exact body. */
  body: unknown;
}

interface Question { instructions?: string; criteria?: Record<string, string> }

/** The part of the request that is identical on every decision of an episode. */
export function envelopeOf(start: StartEvent | null): Envelope | null {
  const questions = start?.questions;
  if (!questions || typeof questions !== "object") return null;
  const instructions: string[] = [];
  const criteria: { id: string; text: string }[] = [];
  for (const q of Object.values(questions as Record<string, Question>)) {
    if (q?.instructions) instructions.push(q.instructions);
    for (const [id, text] of Object.entries(q?.criteria ?? {})) criteria.push({ id, text });
  }
  if (!instructions.length && !criteria.length) return null;
  return { instructions, criteria, body: questions };
}

/** Puts every model's headline measure on one scale, so the bars can be read against each other. */
export function compareBars(values: (number | null)[]): { value: number | null; fraction: number }[] {
  const max = Math.max(0, ...values.map((v) => v ?? 0));
  return values.map((value) => ({ value, fraction: max > 0 ? Math.max(0, (value ?? 0) / max) : 0 }));
}
