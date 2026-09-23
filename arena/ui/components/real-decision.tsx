"use client";

import { GAMES } from "@/lib/games";
import type { GameId } from "@/lib/types";
import { RawDecision } from "./raw-decision";
import { useRecordedDecision } from "./wire";

/** A real decision, loaded from a recorded game: no invented examples. */
export function RealDecision({ game, agent, seed, step = 5 }: { game: GameId; agent: string; seed: number; step?: number }) {
  const { start, step: chosen, failed } = useRecordedDecision(game, agent, seed, step);

  if (failed) return <p className="text-micro text-ink-soft">This example could not be loaded.</p>;
  if (!chosen) return <p className="text-micro text-ink-soft">Loading a real decision…</p>;

  return (
    <div className="my-6 border border-line bg-surface">
      <p className="border-b border-line px-4 py-2.5 text-micro text-ink-soft">
        Decision {chosen.t} of a real {GAMES[game].name} game played by {agent === "jev" ? "Jev" : agent}, seed {seed}.
      </p>
      <RawDecision start={start} step={chosen} open />
    </div>
  );
}
