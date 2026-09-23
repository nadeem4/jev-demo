import type { AnyFrame, EndEvent, GameId, StartEvent, StepEvent } from "./types";

/** What one side's panel shows: the latest decision and how the episode is going. */
export interface PanelView {
  start: StartEvent | null;
  startFrame: AnyFrame | null;
  step: StepEvent | null;
  end: EndEvent | null;
  failed: string | null;
  status: string;
  waiting: boolean;
  started: boolean;
}

export const EMPTY_VIEW: PanelView = {
  start: null, startFrame: null, step: null, end: null, failed: null, status: "", waiting: false, started: false,
};

/** Views are tagged with the game they came from. Each game has its own frame shape,
 * so views from another game (right after switching) must never be rendered. */
export interface TaggedViews { game: GameId; views: PanelView[] }

export function viewsForGame(tagged: TaggedViews, game: GameId): PanelView[] {
  return tagged.game === game ? tagged.views : tagged.views.map(() => EMPTY_VIEW);
}
