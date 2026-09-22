import type { Action, Answers, RoadState } from "./types";

const UNSURE_BELOW = 0.5;

/** Plain-language problems with a decision, derived from what the model was told. */
export function concerns(state: RoadState, action: Action, answers: Answers | null): string[] {
  const out: string[] = [];
  for (const [move, key, side] of [["LANE_LEFT", "left_lane", "left"], ["LANE_RIGHT", "right_lane", "right"]] as const) {
    if (action !== move) continue;
    const lane = state[key] ?? "";
    if (lane.startsWith("no lane")) out.push(`There is no lane on the ${side}, so this move does nothing`);
    else if (lane.startsWith("BLOCKED")) out.push(`The ${side} lane is blocked`);
  }
  const p = answers?.action?.probabilities?.[action];
  if (p !== undefined && p < UNSURE_BELOW) out.push(`Unsure: only ${Math.round(p * 100)}% on this move`);
  return out;
}

export type Tone = "danger" | "clear" | "muted" | "normal";

/** How a road description should read at a glance. */
export function tone(text: string): Tone {
  if (text.startsWith("BLOCKED") || text.startsWith("car very close")) return "danger";
  if (text === "clear") return "clear";
  if (text.startsWith("no lane")) return "muted";
  return "normal";
}
