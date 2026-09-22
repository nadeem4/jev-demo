// Mirrors the event stream written by arena/highway/runner.py.

export type Action = "LANE_LEFT" | "IDLE" | "LANE_RIGHT" | "FASTER" | "SLOWER";

export interface Car { x: number; y: number; heading: number; speed: number }
export interface Frame { ego: Car & { crashed: boolean }; others: Car[] }

export type RoadState = Record<string, string>;

export interface ChoiceAnswer { type: "choice"; choice?: string; probabilities: Record<string, number> }
export type Answers = Record<string, ChoiceAnswer>;

export interface StartEvent { type: "start"; game: string; agent: string; seed: number; frame: Frame }
export interface StepEvent {
  type: "step"; t: number; state: RoadState; answers: Answers | null; action: Action;
  latency_ms: number; reward: number; frame: Frame; error?: string; retries?: number;
}
export interface EndEvent { type: "end"; steps: number; crashed: boolean; distance_m: number; total_reward: number; avg_speed: number }
export interface StatusEvent { type: "status"; message: string }
export interface ErrorEvent { type: "error"; message: string }

export type ArenaEvent = StartEvent | StepEvent | EndEvent | StatusEvent | ErrorEvent;
