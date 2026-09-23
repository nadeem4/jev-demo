import { describe, expect, it } from "vitest";
import { viewport } from "./geometry";

describe("viewport for a horizontal road", () => {
  const v = viewport({ width: 440, height: 120, egoX: 100 });

  it("fits the four lanes down the canvas height", () => {
    expect(v.laneCenter(0)).toBeLessThan(v.laneCenter(3));
    expect(v.laneCenter(0)).toBeGreaterThan(0);
    expect(v.laneCenter(3)).toBeLessThan(120);
  });

  it("maps highway y (0 = leftmost lane) to screen y", () => {
    expect(v.y(0)).toBeCloseTo(v.laneCenter(0));
    expect(v.y(12)).toBeCloseTo(v.laneCenter(3));
  });

  it("keeps the road edges inside the canvas, above and below every lane", () => {
    expect(v.roadTop).toBeGreaterThan(0);
    expect(v.roadTop).toBeLessThan(v.laneCenter(0));
    expect(v.roadBottom).toBeGreaterThan(v.laneCenter(3));
    expect(v.roadBottom).toBeLessThan(120);
  });

  it("draws cars ahead of the ego car further to the right", () => {
    expect(v.x(130)).toBeGreaterThan(v.x(100));
    expect(v.x(80)).toBeLessThan(v.x(100));
  });

  it("keeps the ego car in the left part of the view, so the road ahead is visible", () => {
    expect(v.x(100)).toBeLessThan(440 * 0.4);
    expect(v.x(100)).toBeGreaterThan(0);
  });
});
