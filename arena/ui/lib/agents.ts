import type { Action } from "./types";

export const AGENTS = {
  jev: { name: "Jev", about: "TypeSafe, closed API" },
  laya: { name: "Laya", about: "Open source, runs on this machine" },
  idle: { name: "Keep lane", about: "Baseline that never changes anything" },
  random: { name: "Random", about: "Baseline that picks at random" },
} as const;

export type AgentId = keyof typeof AGENTS;

export const ACTIONS: { id: Action; label: string }[] = [
  { id: "LANE_LEFT", label: "Change to left lane" },
  { id: "IDLE", label: "Keep lane and speed" },
  { id: "LANE_RIGHT", label: "Change to right lane" },
  { id: "FASTER", label: "Speed up" },
  { id: "SLOWER", label: "Slow down" },
];

export const STATE_LABELS: Record<string, string> = {
  ahead_in_your_lane: "Ahead",
  left_lane: "Left lane",
  right_lane: "Right lane",
  your_lane: "Lane",
  your_speed: "Speed",
};
