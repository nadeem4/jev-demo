// Mirrors the event stream written by arena/runner.py.

export type GameId = "highway" | "snake" | "blackjack";

/** Each game draws its own frame shape; see lib/draw/*. */
export type AnyFrame = object;

export interface Car { x: number; y: number; heading: number; speed: number }
/** A highway-env frame. */
export interface Frame { ego: Car & { crashed: boolean }; others: Car[] }

export type RoadState = Record<string, string>;

export interface ChoiceAnswer { type: "choice"; choice?: string; probabilities: Record<string, number> }
export type Answers = Record<string, ChoiceAnswer>;

export interface StartEvent { type: "start"; game: GameId; agent: string; seed: number; options: string[]; frame: AnyFrame }
export interface StepEvent {
  type: "step"; t: number; state: RoadState; answers: Answers | null; action: string;
  latency_ms: number; frame: AnyFrame; error?: string; retries?: number;
}
/** Game summary: each game adds its own metrics next to `steps`. */
export type EndEvent = { type: "end"; steps: number } & Record<string, number | boolean | string>;
export interface StatusEvent { type: "status"; message: string }
export interface ErrorEvent { type: "error"; message: string }

export type ArenaEvent = StartEvent | StepEvent | EndEvent | StatusEvent | ErrorEvent;
