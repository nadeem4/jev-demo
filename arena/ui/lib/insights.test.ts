import { describe, expect, it } from "vitest";
import { concerns, tone } from "./insights";
import type { Answers, RoadState } from "./types";

const state = (over: Partial<RoadState> = {}): RoadState => ({
  your_lane: "lane 2 of 4 (counting from the left)",
  your_speed: "25 m/s (allowed range 20-30)",
  ahead_in_your_lane: "clear",
  left_lane: "clear",
  right_lane: "clear",
  ...over,
});
const answers = (probs: Record<string, number>): Answers => ({ action: { type: "choice", probabilities: probs } });

describe("concerns", () => {
  it("flags a lane change into a lane that does not exist", () => {
    const s = state({ right_lane: "no lane (you are in the rightmost lane)" });
    expect(concerns(s, "LANE_RIGHT", answers({ LANE_RIGHT: 0.9 }))).toContain("There is no lane on the right, so this move does nothing");
  });

  it("flags a lane change into a blocked lane", () => {
    const s = state({ left_lane: "BLOCKED: car right beside you" });
    expect(concerns(s, "LANE_LEFT", answers({ LANE_LEFT: 0.9 }))).toContain("The left lane is blocked");
  });

  it("flags a low-confidence decision", () => {
    expect(concerns(state(), "IDLE", answers({ IDLE: 0.31 }))).toContain("Unsure: only 31% on this move");
  });

  it("is quiet for a confident, possible move", () => {
    expect(concerns(state(), "IDLE", answers({ IDLE: 0.95 }))).toEqual([]);
  });
});

describe("tone", () => {
  it("classifies road descriptions", () => {
    expect(tone("BLOCKED: car right beside you")).toBe("danger");
    expect(tone("car very close ahead (6 m), 3 m/s slower than you")).toBe("danger");
    expect(tone("clear")).toBe("clear");
    expect(tone("no lane (you are in the leftmost lane)")).toBe("muted");
    expect(tone("car ahead (40 m), about your speed")).toBe("normal");
  });
});
