import { describe, expect, it } from "vitest";
import { concerns, tone } from "./insights";
import type { Frame } from "./types";
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
    expect(concerns("highway", s, "LANE_RIGHT", answers({ LANE_RIGHT: 0.9 }), null)).toContain("There is no lane on the right, so this move does nothing");
  });

  it("flags a lane change into a blocked lane", () => {
    const s = state({ left_lane: "BLOCKED: car right beside you" });
    expect(concerns("highway", s, "LANE_LEFT", answers({ LANE_LEFT: 0.9 }), null)).toContain("The left lane is blocked");
  });

  it("flags a low-confidence decision", () => {
    expect(concerns("highway", state(), "IDLE", answers({ IDLE: 0.31 }), null)).toContain("Unsure: only 31% on this move");
  });

  it("is quiet for a confident, possible move", () => {
    expect(concerns("highway", state(), "IDLE", answers({ IDLE: 0.95 }), null)).toEqual([]);
  });
});

describe("snake concerns", () => {
  it("flags a move into a wall or the snake's own body", () => {
    const s = { if_you_turn_left: "BLOCKED: wall right next to you", if_you_go_straight: "clear for 3 cells, then the wall", if_you_turn_right: "BLOCKED: your own body right next to you" };
    expect(concerns("snake", s, "TURN_LEFT", answers({ TURN_LEFT: 0.9 }), null)).toContain("This move runs into the wall");
    expect(concerns("snake", s, "TURN_RIGHT", answers({ TURN_RIGHT: 0.9 }), null)).toContain("This move runs into your own body");
    expect(concerns("snake", s, "STRAIGHT", answers({ STRAIGHT: 0.9 }), null)).toEqual([]);
  });
});

describe("blackjack concerns", () => {
  it("shows when the move differs from basic strategy", () => {
    const frame = { advice: "HIT" } as unknown as Frame;
    expect(concerns("blackjack", {}, "STICK", answers({ STICK: 0.9 }), frame)).toContain("Basic strategy says HIT here");
    expect(concerns("blackjack", {}, "HIT", answers({ HIT: 0.9 }), frame)).toEqual([]);
  });
});

describe("tone", () => {
  it("classifies road descriptions", () => {
    expect(tone("BLOCKED: car right beside you")).toBe("danger");
    expect(tone("car very close ahead (6 m), 3 m/s slower than you")).toBe("danger");
    expect(tone("clear")).toBe("clear");
    expect(tone("no lane (you are in the leftmost lane)")).toBe("muted");
    expect(tone("car ahead (40 m), about your speed")).toBe("normal");
    expect(tone("clear for 5 cells, then the wall")).toBe("normal");
  });
});
