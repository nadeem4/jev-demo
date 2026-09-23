import { describe, expect, it } from "vitest";
import { GAMES, GAME_IDS } from "./games";
import { EMPTY_VIEW } from "./views";
import type { StepEvent } from "./types";

const viewWith = (frame: object, startFrame: object | null = null) => ({
  ...EMPTY_VIEW,
  startFrame,
  step: { type: "step", t: 1, state: {}, answers: null, action: "IDLE", latency_ms: 1, frame } as StepEvent,
});

describe("game config", () => {
  it("lists the three games in order", () => {
    expect(GAME_IDS).toEqual(["highway", "snake", "blackjack"]);
  });

  it("offers Jev and Laya in every game, plus that game's baselines", () => {
    expect(GAMES.highway.agents.map((a) => a.id)).toEqual(["jev", "laya", "idle", "random"]);
    expect(GAMES.snake.agents.map((a) => a.id)).toEqual(["jev", "laya", "greedy", "random"]);
    expect(GAMES.blackjack.agents.map((a) => a.id)).toEqual(["jev", "laya", "basic-strategy", "always-stick", "random"]);
  });

  it("labels every option and orders every state field", () => {
    for (const id of GAME_IDS) {
      const g = GAMES[id];
      expect(g.options.length).toBeGreaterThan(1);
      for (const o of g.options) expect(o.label).toBeTruthy();
      expect(g.stateOrder.length).toBeGreaterThan(0);
    }
  });

  it("names one headline measure per game, for comparing the two models on one scale", () => {
    for (const id of GAME_IDS) {
      expect(GAMES[id].measure.label).toBeTruthy();
      expect(GAMES[id].measure.value(EMPTY_VIEW)).toBeNull();
    }
  });

  it("measures highway in metres travelled since the start of the episode", () => {
    const view = viewWith({ ego: { x: 300 } }, { ego: { x: 180 } });
    expect(GAMES.highway.measure.value(view)).toBeCloseTo(120);
    expect(GAMES.highway.measure.format(120.4)).toBe("120 m");
  });

  it("measures snake in food eaten", () => {
    expect(GAMES.snake.measure.value(viewWith({ snake: [1, 2, 3, 4, 5] }))).toBe(2);
    expect(GAMES.snake.measure.format(2)).toBe("2");
  });

  it("measures blackjack in hands won", () => {
    expect(GAMES.blackjack.measure.value(viewWith({ wins: 7, losses: 3, draws: 1 }))).toBe(7);
    expect(GAMES.blackjack.measure.format(7)).toBe("7");
  });
});
