import { describe, expect, it } from "vitest";
import { buildScorecard } from "./scorecard";

const results = {
  highway: [{ agents: {
    jev: { metrics: { crashed: { rate: 0 }, distance_m: { mean: 851 } }, decisions: { latency_p50_ms: 320, failed: 1, retries: 330 } },
    laya: { metrics: { crashed: { rate: 0.9 }, distance_m: { mean: 437 } }, decisions: { latency_p50_ms: 185, failed: 0, retries: 0 } },
  } }],
  blackjack: [{ agents: {
    jev: { metrics: {}, reference: { matches: 0.762, confidence_gap: 0.402 }, decisions: { latency_p50_ms: 304, failed: 8, retries: 171 } },
    laya: { metrics: {}, reference: { matches: 0.495, confidence_gap: 0.501 }, decisions: { latency_p50_ms: 107, failed: 0, retries: 0 } },
  } }],
} as never;
const probes = { agents: { jev: { highway: { sensitivity: 0.747 }, blackjack: { sensitivity: 0.43 } },
                           laya: { highway: { sensitivity: 0.421 }, blackjack: { sensitivity: 0.037 } } } } as never;

describe("buildScorecard", () => {
  const rows = buildScorecard(results, probes);
  const row = (label: string) => rows.find((r) => r.label === label)!;

  it("scores crash rate, where lower wins", () => {
    expect(row("Highway crash rate").jev).toBe("0%");
    expect(row("Highway crash rate").laya).toBe("90%");
    expect(row("Highway crash rate").winner).toBe("jev");
  });

  it("scores matching the best blackjack play, where higher wins", () => {
    expect(row("Blackjack: matches the best play").jev).toBe("76%");
    expect(row("Blackjack: matches the best play").winner).toBe("jev");
  });

  it("averages sensitivity across games", () => {
    expect(row("Reads the situation").jev).toBe("0.59");
    expect(row("Reads the situation").laya).toBe("0.23");
    expect(row("Reads the situation").winner).toBe("jev");
  });

  it("scores calibration by the gap between confidence and being right, where lower wins", () => {
    expect(row("Confidence matches being right").winner).toBe("jev");
  });

  it("gives speed and reliability to the faster, unblocked model", () => {
    expect(row("Decision time").winner).toBe("laya");
    expect(row("Failed decisions").jev).toBe("9");
    expect(row("Failed decisions").winner).toBe("laya");
  });

  it("includes the fixed facts that need no measurement", () => {
    expect(row("Cost").winner).toBe("laya");
    expect(row("Control").laya).toMatch(/open/i);
  });

  it("leaves a row out when the data is missing", () => {
    expect(buildScorecard({} as never, probes).some((r) => r.label === "Highway crash rate")).toBe(false);
  });
});
