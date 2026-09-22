import { describe, expect, it } from "vitest";
import { commonSeeds, makeUrls } from "./api";

describe("makeUrls", () => {
  it("talks to the arena server when running locally", () => {
    const u = makeUrls(false, "http://localhost:8000");
    expect(u.results).toBe("http://localhost:8000/api/results");
    expect(u.runsIndex).toBe("http://localhost:8000/api/runs");
    expect(u.run("snake", "jev", 3)).toBe("http://localhost:8000/api/runs/snake/jev/3");
    expect(u.live!("snake", "jev", 3)).toBe("http://localhost:8000/api/live?game=snake&agent=jev&seed=3");
  });

  it("reads exported files when published as a static site", () => {
    const u = makeUrls(true, "http://localhost:8000");
    expect(u.results).toBe("/data/results.json");
    expect(u.runsIndex).toBe("/data/runs.json");
    expect(u.run("snake", "jev", 3)).toBe("/data/runs/snake/jev/seed-3.json");
    expect(u.live).toBeNull();
  });
});

describe("commonSeeds", () => {
  const index = { snake: { jev: [0, 1, 2, 5], laya: [1, 2, 3, 5], greedy: [0] } };

  it("lists seeds recorded for both agents", () => {
    expect(commonSeeds(index, "snake", "jev", "laya")).toEqual([1, 2, 5]);
  });

  it("works when both sides are the same agent", () => {
    expect(commonSeeds(index, "snake", "greedy", "greedy")).toEqual([0]);
  });

  it("is empty when a game or agent has no recordings", () => {
    expect(commonSeeds(index, "highway", "jev", "laya")).toEqual([]);
    expect(commonSeeds(index, "snake", "jev", "random")).toEqual([]);
  });
});
