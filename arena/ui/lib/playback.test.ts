import { describe, expect, it } from "vitest";
import { Playback } from "./playback";
import type { ArenaEvent, Frame } from "./types";

const frame = (x: number): Frame => ({ ego: { x, y: 12, heading: 0, speed: 25, crashed: false }, others: [] });
const start: ArenaEvent = { type: "start", game: "highway", agent: "jev", seed: 0, frame: frame(0) };
const step = (t: number): ArenaEvent => ({
  type: "step", t, state: {}, answers: null, action: "IDLE", latency_ms: 300, reward: 1, frame: frame(t * 25),
});

describe("Playback", () => {
  it("is not ready until the start event arrives", () => {
    const p = new Playback();
    expect(p.ready).toBe(false);
    p.push(start);
    expect(p.ready).toBe(true);
  });

  it("plays one step per step duration", () => {
    const p = new Playback();
    [start, step(1), step(2)].forEach((e) => p.push(e));
    p.tick(0, 1000, true);
    expect(p.current?.t).toBe(1);
    p.tick(500, 1000, true);
    expect(p.current?.t).toBe(1);
    p.tick(1000, 1000, true);
    expect(p.current?.t).toBe(2);
  });

  it("interpolates between the previous and next frame", () => {
    const p = new Playback();
    [start, step(1)].forEach((e) => p.push(e));
    p.tick(0, 1000, true);
    expect(p.tick(500, 1000, true).ego.x).toBeCloseTo(12.5);
  });

  it("waits for the model when no step is queued", () => {
    const p = new Playback();
    p.push(start);
    p.tick(0, 1000, true);
    p.tick(2000, 1000, true);
    expect(p.waiting).toBe(true);
    p.push(step(1));
    p.tick(2100, 1000, true);
    expect(p.current?.t).toBe(1);
    expect(p.waiting).toBe(false);
  });

  it("does not advance while held so both roads start together", () => {
    const p = new Playback();
    [start, step(1)].forEach((e) => p.push(e));
    p.tick(5000, 1000, false);
    expect(p.current).toBeNull();
  });

  it("records the episode summary at the end", () => {
    const p = new Playback();
    [start, step(1), { type: "end", steps: 1, crashed: true, distance_m: 25, total_reward: 1, avg_speed: 25 } as ArenaEvent]
      .forEach((e) => p.push(e));
    p.tick(0, 1000, true);
    p.tick(1000, 1000, true);
    expect(p.end?.crashed).toBe(true);
  });

  it("marks the road failed on an error so it does not hold the other road", () => {
    const p = new Playback();
    p.push({ type: "error", message: "laya: model files missing" });
    expect(p.failed).toBe("laya: model files missing");
  });
});
