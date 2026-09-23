import { describe, expect, it } from "vitest";
import { verdict } from "./verdict";
import type { Run } from "./scorecard";

const run = (agents: Record<string, number>, key = "crashed", kind: "rate" | "mean" = "rate"): Run =>
  ({ agents: Object.fromEntries(Object.entries(agents).map(([id, v]) => [id, {
    metrics: { [key]: kind === "rate" ? { rate: v } : { mean: v } }, decisions: { latency_p50_ms: 0, failed: 0, retries: 0 },
  }])) } as unknown as Run);

describe("verdict", () => {
  it("names the winner by the game's deciding metric", () => {
    const v = verdict("highway", run({ jev: 0, laya: 0.9, idle: 0.9, random: 1 }))!;
    expect(v.winner).toBe("jev");
    expect(v.value).toBe("0%");
  });

  it("says when a baseline beat both models, and which model did best", () => {
    const v = verdict("snake", run({ jev: 1.8, laya: 0.5, greedy: 17.3, random: 0.2 }, "food_eaten", "mean"))!;
    expect(v.winner).toBe("greedy");
    expect(v.winnerIsModel).toBe(false);
    expect(v.bestModel).toBe("jev");
    expect(v.bestModelValue).toBe("1.8");
  });

  it("reports a tie when the top two are level", () => {
    const v = verdict("highway", run({ jev: 0.9, laya: 0.9 }))!;
    expect(v.tied).toEqual(["jev", "laya"]);
  });

  it("has nothing to say without the deciding metric", () => {
    expect(verdict("highway", run({ jev: 2 }, "distance_m", "mean"))).toBeNull();
  });

  it("ignores an agent that defines the metric, like blackjack's basic strategy", () => {
    const v = verdict("blackjack", run({ jev: 0.77, laya: 0.5, "basic-strategy": 1, random: 0.49 }, "basic_strategy_match", "mean"))!;
    expect(v.winner).toBe("jev");
    expect(v.winnerIsModel).toBe(true);
  });
});
