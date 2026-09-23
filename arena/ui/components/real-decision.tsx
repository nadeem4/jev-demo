"use client";

import { useEffect, useState } from "react";
import { urls } from "@/lib/api";
import { GAMES } from "@/lib/games";
import type { ArenaEvent, GameId, StartEvent, StepEvent } from "@/lib/types";
import { RawDecision } from "./raw-decision";

/** A real decision, loaded from a recorded game: no invented examples. */
export function RealDecision({ game, agent, seed, step = 5 }: { game: GameId; agent: string; seed: number; step?: number }) {
  const [events, setEvents] = useState<ArenaEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(urls.run(game, agent, seed))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setEvents)
      .catch(() => setFailed(true));
  }, [game, agent, seed]);

  if (failed) return <p className="text-ink-soft">This example could not be loaded.</p>;
  if (!events) return <p className="text-ink-soft">Loading a real decision…</p>;

  const start = events.find((e) => e.type === "start") as StartEvent | undefined;
  const steps = events.filter((e): e is StepEvent => e.type === "step");
  const chosen = steps[Math.min(step, steps.length - 1)];
  if (!chosen) return null;

  return (
    <div className="my-6 rounded-md border-2 border-line p-4">
      <p className="text-sm text-ink-soft">
        Decision {chosen.t} of a real {GAMES[game].name} game played by {agent === "jev" ? "Jev" : agent}, seed {seed}.
      </p>
      <RawDecision start={start ?? null} step={chosen} open />
    </div>
  );
}
