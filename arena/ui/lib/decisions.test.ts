import { describe, expect, it } from "vitest";
import { compareBars, decisionRows, optionShares, questionsOf, standing } from "./decisions";
import type { EndEvent, StartEvent, StepEvent } from "./types";
import { EMPTY_VIEW } from "./views";

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

describe("optionShares", () => {
  const OPTIONS = [{ id: "LANE_LEFT" }, { id: "IDLE" }, { id: "FASTER" }];

  it("keeps every option the game offers, in the game's order, with the played one marked", () => {
    const shares = optionShares(OPTIONS, step(3, "IDLE", { LANE_LEFT: 0.1, IDLE: 0.7, FASTER: 0.2 }));
    expect(shares).toEqual([
      { id: "LANE_LEFT", probability: 0.1, played: false },
      { id: "IDLE", probability: 0.7, played: true },
      { id: "FASTER", probability: 0.2, played: false },
    ]);
  });

  it("still lists an option the model gave no probability, rather than dropping it", () => {
    const shares = optionShares(OPTIONS, step(3, "IDLE", { IDLE: 1 }));
    expect(shares.map((s) => s.id)).toEqual(["LANE_LEFT", "IDLE", "FASTER"]);
    expect(shares[0].probability).toBeNull();
  });

  it("still marks the move the game played when the call failed and no answer came back", () => {
    const failed = step(3, "IDLE", {}, { answers: undefined, error: "timeout" });
    expect(optionShares(OPTIONS, failed)).toEqual([
      { id: "LANE_LEFT", probability: null, played: false },
      { id: "IDLE", probability: null, played: true },
      { id: "FASTER", probability: null, played: false },
    ]);
  });

  it("has nothing to show before a decision", () => {
    expect(optionShares(OPTIONS, null)).toEqual([]);
  });
});

describe("standing", () => {
  const playing = { ...EMPTY_VIEW, started: true, step: step(7, "IDLE", { IDLE: 0.9 }) };
  const ended = (end: Partial<EndEvent>) => ({ ...playing, end: { type: "end", steps: 16, ...end } as EndEvent });

  it("says what the model is doing while its episode runs", () => {
    expect(standing("highway", playing)).toBe("driving");
    expect(standing("snake", playing)).toBe("moving");
    expect(standing("blackjack", playing)).toBe("playing");
  });

  it("says how the episode ended, and when", () => {
    expect(standing("highway", ended({ crashed: true }))).toBe("crashed at 16");
    expect(standing("highway", ended({ crashed: false }))).toBe("drove all 16");
    expect(standing("snake", ended({ died: true }))).toBe("died at 16");
    expect(standing("snake", ended({ died: false }))).toBe("survived 16");
    expect(standing("blackjack", ended({}))).toBe("finished");
  });

  it("says so before anything has been played, and when the run never arrived", () => {
    expect(standing("highway", EMPTY_VIEW)).toBe("not started");
    expect(standing("highway", { ...EMPTY_VIEW, started: true })).toBe("starting");
    expect(standing("highway", { ...playing, failed: "no recording" })).toBe("did not run");
  });
});
