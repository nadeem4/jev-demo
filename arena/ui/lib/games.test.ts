import { describe, expect, it } from "vitest";
import { GAMES, GAME_IDS } from "./games";

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
});
