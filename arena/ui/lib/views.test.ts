import { describe, expect, it } from "vitest";
import { EMPTY_VIEW, viewsForGame } from "./views";
import type { StepEvent } from "./types";

const highwayStep = { type: "step", t: 3, frame: { ego: {}, others: [] } } as unknown as StepEvent;

describe("viewsForGame", () => {
  it("shows the views recorded for the game on screen", () => {
    const views = [{ ...EMPTY_VIEW, step: highwayStep }, EMPTY_VIEW];
    expect(viewsForGame({ game: "highway", views }, "highway")).toBe(views);
  });

  it("never shows another game's decisions after switching games", () => {
    const tagged = { game: "highway" as const, views: [{ ...EMPTY_VIEW, step: highwayStep }, EMPTY_VIEW] };
    expect(viewsForGame(tagged, "snake")).toEqual([EMPTY_VIEW, EMPTY_VIEW]);
  });
});
