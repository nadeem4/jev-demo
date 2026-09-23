import { describe, expect, it } from "vitest";
import { compareBars, decisionRows, questionsOf } from "./decisions";
import type { StartEvent, StepEvent } from "./types";

const step = (t: number, action: string, probs: Record<string, number>, over: Partial<StepEvent> = {}): StepEvent => ({
  type: "step",
  t,
  state: { your_lane: "lane 2 of 4 (counting from the left)", left_lane: "clear", right_lane: "clear", ahead_in_your_lane: "clear" },
  answers: { action: { type: "choice", probabilities: probs } },
  action,
  latency_ms: 300,
  frame: {},
  ...over,
});

const start = (questions: unknown, options: string[] = ["IDLE"]): StartEvent => ({
  type: "start", game: "highway", agent: "jev", seed: 4, options, questions, frame: {},
});

const QUESTIONS = {
  action: {
    type: "choice",
    instructions: "You are driving on a highway. Pick the next action.",
    criteria: { IDLE: "Keep your lane and speed.", FASTER: "Accelerate." },
  },
};

describe("decisionRows", () => {
  it("pairs both models on one row per decision, newest first", () => {
    const rows = decisionRows("highway", [
      [step(1, "IDLE", { IDLE: 0.9 }), step(2, "FASTER", { FASTER: 0.7 })],
      [step(1, "SLOWER", { SLOWER: 0.6 }), step(2, "IDLE", { IDLE: 0.8 })],
    ]);
    expect(rows.map((r) => r.t)).toEqual([2, 1]);
    expect(rows[0].cells.map((c) => c.action)).toEqual(["FASTER", "IDLE"]);
    expect(rows[1].cells[1].confidence).toBeCloseTo(0.6);
  });

  it("leaves a cell empty when one model has not reached that decision", () => {
    const rows = decisionRows("highway", [[step(1, "IDLE", { IDLE: 0.9 }), step(2, "IDLE", { IDLE: 0.9 })], [step(1, "IDLE", { IDLE: 0.9 })]]);
    expect(rows[0].cells[1]).toEqual({ action: null, confidence: null, warned: false });
  });

  it("marks the decisions that raised a warning", () => {
    const blocked = step(1, "LANE_LEFT", { LANE_LEFT: 0.9 }, { state: { left_lane: "BLOCKED by a car 5 m away" } });
    const rows = decisionRows("highway", [[blocked], [step(1, "IDLE", { IDLE: 0.9 })]]);
    expect(rows[0].cells[0].warned).toBe(true);
    expect(rows[0].cells[1].warned).toBe(false);
  });

  it("has no rows before anything has been played", () => {
    expect(decisionRows("highway", [[], []])).toEqual([]);
  });
});

describe("questionsOf", () => {
  it("hands back the questions exactly as recorded, named by the game's option count", () => {
    const q = questionsOf(start(QUESTIONS, ["IDLE", "FASTER", "SLOWER", "LANE_LEFT", "LANE_RIGHT"]))!;
    expect(q.body).toEqual(QUESTIONS);
    expect(q.summary).toBe("questions — the 5 options, identical on every call");
  });

  it("says option, not options, when the game offers only one", () => {
    expect(questionsOf(start(QUESTIONS))!.summary).toBe("questions — the 1 option, identical on every call");
  });

  it("names the questions without a count when the recording lists no options", () => {
    expect(questionsOf(start(QUESTIONS, []))!.summary).toBe("questions — identical on every call");
  });

  it("has nothing to show when the recording has no questions", () => {
    expect(questionsOf(null)).toBeNull();
    expect(questionsOf(start(undefined))).toBeNull();
  });
});

describe("compareBars", () => {
  it("puts both models on one scale, the largest filling the bar", () => {
    expect(compareBars([120, 60])).toEqual([{ value: 120, fraction: 1 }, { value: 60, fraction: 0.5 }]);
  });

  it("leaves the bar empty when nothing has been measured yet", () => {
    expect(compareBars([null, null])).toEqual([{ value: null, fraction: 0 }, { value: null, fraction: 0 }]);
    expect(compareBars([0, 0])).toEqual([{ value: 0, fraction: 0 }, { value: 0, fraction: 0 }]);
  });

  it("never draws a negative bar", () => {
    expect(compareBars([-5, 10])[0].fraction).toBe(0);
  });
});
