"use client";

import { useEffect, useState } from "react";
import { STATIC_SITE, urls } from "@/lib/api";
import { GAMES, GAME_IDS, agentName, type ResultMetric } from "@/lib/games";
import type { GameId } from "@/lib/types";

interface Metric { rate?: number; mean?: number; ci95: [number | null, number | null] }
interface AgentResult {
  episodes: number;
  metrics: Record<string, Metric>;
  decisions: { count: number; failed: number; retries: number; latency_p50_ms: number | null; latency_p95_ms: number | null; avg_confidence: number | null };
}
interface Run {
  game: GameId; seeds: number[]; started: string; finished?: string; commit: string | null;
  models: Record<string, Record<string, string>>; agents: Record<string, AgentResult>;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function format(m: Metric | undefined, spec: ResultMetric) {
  if (!m) return { value: "-", range: "" };
  const v = spec.kind === "rate" ? m.rate! : m.mean!;
  const f = (x: number) => (spec.kind === "rate" || spec.percent ? pct(x) : Number(x.toFixed(2)).toString());
  const [lo, hi] = m.ci95;
  return { value: f(v), range: lo === null || hi === null ? "" : `${f(lo)} to ${f(hi)}` };
}

function best(run: Run, spec: ResultMetric) {
  const vals = Object.entries(run.agents).map(([id, a]) => [id, a.metrics[spec.key]?.[spec.kind === "rate" ? "rate" : "mean"]] as const);
  const known = vals.filter(([, v]) => v !== undefined) as [string, number][];
  if (!known.length) return null;
  return known.reduce((a, b) => ((spec.better === "higher" ? b[1] > a[1] : b[1] < a[1]) ? b : a))[0];
}

export function Results() {
  const [runs, setRuns] = useState<Partial<Record<GameId, Run[]>> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(urls.results).then((r) => r.json()).then(setRuns).catch(() => setError(true));
  }, []);

  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 md:px-8">
      <h1 className="text-4xl font-extrabold leading-none tracking-tight md:text-5xl">Results</h1>
      <p className="mt-3 max-w-[64ch] text-lg leading-relaxed text-ink-soft">
        Every agent plays the same seeds, so each faces the same traffic, food and cards. Ranges are 95% confidence intervals: with few episodes they are wide, and overlapping ranges mean the difference is not settled.
      </p>

      {error && <p className="mt-8 font-semibold text-danger">{STATIC_SITE ? "Could not load the results." : "Could not reach the arena server. Start it with docker compose up, or uv run python -m arena.server."}</p>}
      {runs && GAME_IDS.every((g) => !runs[g]?.length) && (
        <p className="mt-8 max-w-[64ch] text-ink-soft">
          No benchmark results yet. Run one with <code className="font-semibold text-ink">uv run python -m arena.bench --game highway --episodes 20</code> in the arena folder, then reload.
        </p>
      )}

      {runs && GAME_IDS.filter((g) => runs[g]?.length).map((g) => <GameResults key={g} run={runs[g]![0]} older={runs[g]!.length - 1} />)}
    </main>
  );
}

function GameResults({ run, older }: { run: Run; older: number }) {
  const info = GAMES[run.game];
  const ids = Object.keys(run.agents);
  const episodes = run.agents[ids[0]]?.episodes ?? 0;
  const leaders = Object.fromEntries(info.results.map((m) => [m.key, best(run, m)]));
  const date = new Date(run.started).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <section className="mt-12" aria-labelledby={`res-${run.game}`}>
      <h2 id={`res-${run.game}`} className="text-3xl font-extrabold tracking-tight">{info.name}</h2>
      <p className="mt-2 text-ink-soft">
        {episodes} episodes per agent on seeds {run.seeds[0]} to {run.seeds[run.seeds.length - 1]}, run {date}
        {run.commit && <> at commit <code>{run.commit}</code></>}.
        {run.models.jev && <> Jev via {run.models.jev.provider === "typesafe" ? `TypeSafe (${run.models.jev.model})` : "Vercel AI Gateway"}.</>}
        {run.models.laya && <> Laya {run.models.laya.checkpoint} checkpoint on {run.models.laya.device.toUpperCase()}.</>}
        {older > 0 && <> {older} earlier run{older > 1 ? "s" : ""} saved.</>}
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-line text-sm text-ink-soft">
              <th className="py-2 pr-4 font-semibold">Agent</th>
              {info.results.map((m) => (
                <th key={m.key} className="py-2 pr-4 font-semibold">{m.label}<span className="block text-xs font-normal">{m.better} is better</span></th>
              ))}
              <th className="py-2 pr-4 font-semibold">Decision time<span className="block text-xs font-normal">typical / slowest 5%</span></th>
              <th className="py-2 font-semibold">Confidence<span className="block text-xs font-normal">in its chosen move</span></th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => {
              const a = run.agents[id];
              const d = a.decisions;
              const isModel = id === "jev" || id === "laya";
              return (
                <tr key={id} className="border-b border-line align-top">
                  <th scope="row" className="py-3 pr-4 text-base font-extrabold">
                    {agentName(run.game, id)}
                    {d.failed > 0 && <span className="block text-xs font-semibold text-danger">{d.failed} failed decisions</span>}
                  </th>
                  {info.results.map((m) => {
                    const { value, range } = format(a.metrics[m.key], m);
                    return (
                      <td key={m.key} className="py-3 pr-4">
                        <span className={`text-lg ${leaders[m.key] === id ? "font-extrabold" : "font-semibold"}`}>{value}</span>
                        {range && <span className="block text-xs text-ink-soft">{range}</span>}
                      </td>
                    );
                  })}
                  <td className="py-3 pr-4 font-semibold">
                    {isModel && d.latency_p50_ms !== null ? `${Math.round(d.latency_p50_ms)} / ${Math.round(d.latency_p95_ms ?? d.latency_p50_ms)} ms` : "-"}
                    {d.retries > 0 && <span className="block text-xs font-normal text-ink-soft">{d.retries} rate-limit retries</span>}
                  </td>
                  <td className="py-3 font-semibold">{isModel && d.avg_confidence !== null ? pct(d.avg_confidence) : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
