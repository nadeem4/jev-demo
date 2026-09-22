import type { AnyFrame, Answers, GameId, RoadState } from "./types";

const UNSURE_BELOW = 0.5;

const SNAKE_KEYS: Record<string, string> = {
  TURN_LEFT: "if_you_turn_left", STRAIGHT: "if_you_go_straight", TURN_RIGHT: "if_you_turn_right",
};

/** Plain-language problems with a decision, from what the model was told. */
export function concerns(game: GameId, state: RoadState, action: string, answers: Answers | null, frame: AnyFrame | null): string[] {
  const out: string[] = [];
  if (game === "highway") {
    for (const [move, key, side] of [["LANE_LEFT", "left_lane", "left"], ["LANE_RIGHT", "right_lane", "right"]] as const) {
      if (action !== move) continue;
      const lane = state[key] ?? "";
      if (lane.startsWith("no lane")) out.push(`There is no lane on the ${side}, so this move does nothing`);
      else if (lane.startsWith("BLOCKED")) out.push(`The ${side} lane is blocked`);
    }
  } else if (game === "snake") {
    const ahead = state[SNAKE_KEYS[action]] ?? "";
    if (ahead.startsWith("BLOCKED")) out.push(`This move runs into ${ahead.includes("wall") ? "the wall" : "your own body"}`);
  } else if (game === "blackjack") {
    const advice = (frame as { advice?: string } | null)?.advice;
    if (advice && advice !== action) out.push(`Basic strategy says ${advice} here`);
  }
  const p = answers?.action?.probabilities?.[action];
  if (p !== undefined && p < UNSURE_BELOW) out.push(`Unsure: only ${Math.round(p * 100)}% on this move`);
  return out;
}

export type Tone = "danger" | "clear" | "muted" | "normal";

/** How a description should read at a glance. */
export function tone(text: string): Tone {
  if (text.startsWith("BLOCKED") || text.startsWith("car very close")) return "danger";
  if (text === "clear") return "clear";
  if (text.startsWith("no lane")) return "muted";
  return "normal";
}
