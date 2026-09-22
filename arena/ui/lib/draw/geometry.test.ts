import { describe, expect, it } from "vitest";
import { viewport } from "./geometry";

describe("viewport for a vertical road", () => {
  const v = viewport({ width: 160, height: 600, egoX: 100 });

  it("fits the four lanes across the canvas width", () => {
    expect(v.laneCenter(0)).toBeLessThan(v.laneCenter(3));
    expect(v.laneCenter(0)).toBeGreaterThan(0);
    expect(v.laneCenter(3)).toBeLessThan(160);
  });

  it("maps highway y (0 = leftmost lane) to screen x", () => {
    expect(v.sx(0)).toBeCloseTo(v.laneCenter(0));
    expect(v.sx(12)).toBeCloseTo(v.laneCenter(3));
  });

  it("draws cars ahead of the ego car higher on screen", () => {
    expect(v.sy(130)).toBeLessThan(v.sy(100));
    expect(v.sy(80)).toBeGreaterThan(v.sy(100));
  });

  it("keeps the ego car in the lower part of the view", () => {
    expect(v.sy(100)).toBeGreaterThan(600 * 0.6);
  });
});
