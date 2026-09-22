import { describe, expect, it } from "vitest";
import { lerpFrame } from "./highway";
import type { Frame } from "../types";

const f = (x: number, others: number[]): Frame => ({
  ego: { x, y: 12, heading: 0, speed: 25, crashed: false },
  others: others.map((ox) => ({ x: ox, y: 4, heading: 0, speed: 20 })),
});

describe("lerpFrame", () => {
  it("moves the model's car smoothly between decisions", () => {
    expect(lerpFrame(f(0, []), f(25, []), 0.5).ego.x).toBeCloseTo(12.5);
  });

  it("interpolates nearby traffic but snaps cars that changed identity", () => {
    const out = lerpFrame(f(0, [10, 300]), f(25, [30, 20]), 0.5);
    expect(out.others[0].x).toBeCloseTo(20);
    expect(out.others[1].x).toBe(20);
  });
});
