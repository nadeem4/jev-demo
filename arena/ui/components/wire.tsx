"use client";

import { useEffect, useState } from "react";
import { urls } from "@/lib/api";
import type { ArenaEvent, GameId, StartEvent, StepEvent } from "@/lib/types";
import { Code } from "./code";

/** One fetch per recording, shared by every block on the page that quotes it. */
const runs = new Map<string, Promise<ArenaEvent[]>>();

function loadRun(game: GameId, agent: string, seed: number) {
  const url = urls.run(game, agent, seed);
  if (!runs.has(url)) {
    runs.set(url, fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url)))));
  }
  return runs.get(url)!;
}

export interface Recorded { start: StartEvent | null; step: StepEvent | null; failed: boolean }

/** A real decision out of arena/runs: nothing on these pages is typed out by hand. */
export function useRecordedDecision(game: GameId, agent: string, seed: number, index: number): Recorded {
  const [events, setEvents] = useState<ArenaEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    loadRun(game, agent, seed)
      .then((e) => { if (live) setEvents(e); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [game, agent, seed]);

  if (!events) return { start: null, step: null, failed };
  const steps = events.filter((e): e is StepEvent => e.type === "step");
  return {
    start: (events.find((e) => e.type === "start") as StartEvent | undefined) ?? null,
    step: steps[Math.min(index, steps.length - 1)] ?? null,
    failed,
  };
}

interface RecordedQuestion { type: string; instructions: string; criteria?: Record<string, string> }

function questionOf(start: StartEvent | null, name: string): RecordedQuestion | null {
  const questions = start?.questions as Record<string, RecordedQuestion> | undefined;
  return questions?.[name] ?? null;
}

/** The pieces of one recorded call, quoted a fragment at a time. */
export type WirePart = "state" | "question" | "criteria" | "answer";

function fragment(part: WirePart, { start, step }: Recorded): unknown {
  const question = questionOf(start, "action");
  switch (part) {
    case "state":
      return { state: step?.state };
    case "question":
      return { action: { type: question?.type, instructions: question?.instructions } };
    case "criteria":
      return { criteria: question?.criteria };
    case "answer":
      return { action: step?.answers?.action };
  }
}

export function Wire({ game, agent, seed, index = 0, part, mark }: {
  game: GameId; agent: string; seed: number; index?: number; part: WirePart; mark?: string;
}) {
  const recorded = useRecordedDecision(game, agent, seed, index);

  if (recorded.failed) return <p className="text-micro text-ink-soft">This recording could not be loaded.</p>;
  if (!recorded.step) return <p className="text-micro text-ink-soft">Reading the recording…</p>;

  return (
    <div className="min-w-0 border border-line bg-surface">
      <Code value={fragment(part, recorded)} mark={mark} className="" />
    </div>
  );
}
