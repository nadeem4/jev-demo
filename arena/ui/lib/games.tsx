import {
  ArrowBendUpLeft, ArrowBendUpRight, ArrowUp, CaretDoubleDown, CaretDoubleUp, HandPalm, Plus, type Icon,
} from "@phosphor-icons/react";
import type { AnyFrame, EndEvent, GameId, StepEvent } from "./types";

export interface AgentInfo { id: string; name: string; about: string }
export interface OptionInfo { id: string; label: string; icon: Icon }
export interface Stat { label: string; value: string; danger?: boolean }
export interface ResultMetric { key: string; label: string; kind: "rate" | "mean"; better: "higher" | "lower"; percent?: boolean }

export interface GameInfo {
  id: GameId;
  name: string;
  blurb: string;
  agents: AgentInfo[];
  options: OptionInfo[];
  stateOrder: string[];
  stateLabels: Record<string, string>;
  stats: (step: StepEvent | null, end: EndEvent | null) => Stat[];
  results: ResultMetric[];
}

const MODELS: AgentInfo[] = [
  { id: "jev", name: "Jev", about: "TypeSafe, closed API" },
  { id: "laya", name: "Laya", about: "Open source, runs on this machine" },
];

const frameOf = <T,>(step: StepEvent | null) => (step?.frame ?? null) as unknown as T | null;

export const GAMES: Record<GameId, GameInfo> = {
  highway: {
    id: "highway",
    name: "Highway",
    blurb: "Change lanes and speed through dense traffic without crashing.",
    agents: [...MODELS,
      { id: "idle", name: "Keep lane", about: "Baseline that never changes anything" },
      { id: "random", name: "Random", about: "Baseline that picks at random" }],
    options: [
      { id: "LANE_LEFT", label: "Change to left lane", icon: ArrowBendUpLeft },
      { id: "IDLE", label: "Keep lane and speed", icon: ArrowUp },
      { id: "LANE_RIGHT", label: "Change to right lane", icon: ArrowBendUpRight },
      { id: "FASTER", label: "Speed up", icon: CaretDoubleUp },
      { id: "SLOWER", label: "Slow down", icon: CaretDoubleDown },
    ],
    stateOrder: ["ahead_in_your_lane", "left_lane", "right_lane", "your_lane", "your_speed"],
    stateLabels: { ahead_in_your_lane: "Ahead", left_lane: "Left lane", right_lane: "Right lane", your_lane: "Lane", your_speed: "Speed" },
    stats: (step, end) => {
      const f = frameOf<{ ego: { speed: number } }>(step);
      return [
        { label: "Speed", value: f ? `${Math.round(f.ego.speed)} m/s` : "-" },
        { label: "Time", value: step ? `${step.t} s` : "-", danger: Boolean(end?.crashed) },
      ];
    },
    results: [
      { key: "crashed", label: "Crash rate", kind: "rate", better: "lower" },
      { key: "distance_m", label: "Distance (m)", kind: "mean", better: "higher" },
      { key: "avg_speed", label: "Speed (m/s)", kind: "mean", better: "higher" },
    ],
  },
  snake: {
    id: "snake",
    name: "Snake",
    blurb: "Reach the food on a 10 by 10 grid without hitting a wall or yourself.",
    agents: [...MODELS,
      { id: "greedy", name: "Greedy", about: "Baseline that heads for the food and avoids instant death" },
      { id: "random", name: "Random", about: "Baseline that picks at random" }],
    options: [
      { id: "TURN_LEFT", label: "Turn left", icon: ArrowBendUpLeft },
      { id: "STRAIGHT", label: "Go straight", icon: ArrowUp },
      { id: "TURN_RIGHT", label: "Turn right", icon: ArrowBendUpRight },
    ],
    stateOrder: ["food", "if_you_turn_left", "if_you_go_straight", "if_you_turn_right", "your_length"],
    stateLabels: { food: "Food", if_you_turn_left: "Turn left", if_you_go_straight: "Straight", if_you_turn_right: "Turn right", your_length: "Length" },
    stats: (step, end) => {
      const f = frameOf<{ snake: unknown[] }>(step);
      return [
        { label: "Food", value: f ? String(f.snake.length - 3) : "-" },
        { label: "Moves", value: step ? String(step.t) : "-", danger: Boolean(end?.died) },
      ];
    },
    results: [
      { key: "food_eaten", label: "Food eaten", kind: "mean", better: "higher" },
      { key: "died", label: "Death rate", kind: "rate", better: "lower" },
      { key: "steps", label: "Moves", kind: "mean", better: "higher" },
    ],
  },
  blackjack: {
    id: "blackjack",
    name: "Blackjack",
    blurb: "Twenty hands against the dealer. Each decision is scored against basic strategy, the optimal play.",
    agents: [...MODELS,
      { id: "basic-strategy", name: "Basic strategy", about: "The optimal stick or hit play" },
      { id: "always-stick", name: "Always stick", about: "Baseline that never takes a card" },
      { id: "random", name: "Random", about: "Baseline that picks at random" }],
    options: [
      { id: "STICK", label: "Stick", icon: HandPalm },
      { id: "HIT", label: "Hit", icon: Plus },
    ],
    stateOrder: ["your_hand", "dealer_shows", "hand"],
    stateLabels: { your_hand: "Your hand", dealer_shows: "Dealer shows", hand: "Hand" },
    stats: (step) => {
      const f = frameOf<{ wins: number; losses: number; draws: number; net: number }>(step);
      return [
        { label: "Won-lost-drawn", value: f ? `${f.wins}-${f.losses}-${f.draws}` : "-" },
        { label: "Net", value: f ? (f.net > 0 ? `+${f.net}` : String(f.net)) : "-", danger: Boolean(f && f.net < 0) },
      ];
    },
    results: [
      { key: "basic_strategy_match", label: "Matches basic strategy", kind: "mean", better: "higher", percent: true },
      { key: "return_per_hand", label: "Return per hand", kind: "mean", better: "higher" },
      { key: "net", label: "Net per 20 hands", kind: "mean", better: "higher" },
    ],
  },
};

export const GAME_IDS = Object.keys(GAMES) as GameId[];

export const agentName = (game: GameId, id: string) => GAMES[game].agents.find((a) => a.id === id)?.name ?? id;

export type { AnyFrame };
