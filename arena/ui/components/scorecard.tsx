"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { urls } from "@/lib/api";
import { buildScorecard, type Probes, type Results, type ScoreRow } from "@/lib/scorecard";

const GROUP_NOTE: Record<string, string> = {
  Decisions: "Playing the games: 10 episodes per agent, every agent on the same seeds.",
  Understanding: "Whether the answer follows the situation, and whether the stated confidence can be trusted.",
  Engineering: "What it costs to run, and what it demands of you.",
};

export function Scorecard() {
  const [results, setResults] = useState<Results | null>(null);
  const [probes, setProbes] = useState<Probes | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([fetch(urls.results).then((r) => r.json()), fetch(urls.probes).then((r) => r.json()).catch(() => null)])
      .then(([r, p]) => { setResults(r); setProbes(p); })
      .catch(() => setFailed(true));
  }, []);

  const rows = results ? buildScorecard(results, probes) : [];
  const wins = (who: "jev" | "laya") => rows.filter((r) => r.winner === who).length;
  const groups = [...new Set(rows.map((r) => r.group))];

  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-20 pt-8 md:px-8">
      <h1 className="text-4xl font-extrabold leading-none tracking-tight md:text-5xl">Which one is better?</h1>
      <p className="mt-3 max-w-[64ch] text-lg leading-relaxed text-ink-soft">
        It depends on the metric, so here is every metric we measure, and who wins each. The numbers come from the same runs as the{" "}
        <Link href="/results/" prefetch={false} className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">Results</Link>.
      </p>

      {failed && <p className="mt-8 font-semibold text-danger">Could not load the measurements.</p>}

      {rows.length > 0 && (
        <p className="mt-6 text-lg">
          <b>Jev wins {wins("jev")} of {rows.length}</b>, and they are the ones about making good decisions.{" "}
          <b>Laya wins {wins("laya")}</b>, and they are the ones about running it.
        </p>
      )}

      {groups.map((group) => (
        <section key={group} className="mt-10">
          <h2 className="text-2xl font-extrabold tracking-tight">{group}</h2>
          <p className="mt-1 max-w-[70ch] text-ink-soft">{GROUP_NOTE[group]}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-line text-sm text-ink-soft">
                  <th className="py-2 pr-4 font-semibold">Metric</th>
                  <th className="py-2 pr-4 font-semibold">Jev</th>
                  <th className="py-2 pr-4 font-semibold">Laya</th>
                  <th className="py-2 font-semibold">Winner</th>
                </tr>
              </thead>
              <tbody>
                {rows.filter((r) => r.group === group).map((r) => <Row key={r.label} row={r} />)}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="mt-12 max-w-[70ch]">
        <h2 className="text-2xl font-extrabold tracking-tight">What to keep in mind</h2>
        <ul className="mt-4 grid gap-3 text-lg leading-relaxed">
          <li><b>Ten episodes per game.</b> Enough to see large differences, not enough to split close ones. The Results page shows the ranges.</li>
          <li><b>Decision time is not a fair race yet.</b> Jev answers over the network with rate limits; Laya ran on a laptop CPU, not the GPU it is built for, where its makers report about 33 ms.</li>
          <li><b>These games are not what Laya was trained for.</b> It was trained on support tickets, moderation and similar work. Its weights are open, so it can be fine-tuned on decisions like these; that is the next experiment.</li>
        </ul>
      </section>
    </main>
  );
}

function Row({ row }: { row: ScoreRow }) {
  const cell = (who: "jev" | "laya", text: string) =>
    <td className={`py-3 pr-4 ${row.winner === who ? "font-extrabold" : "font-semibold text-ink-soft"}`}>{text}</td>;
  return (
    <tr className="border-b border-line align-top">
      <th scope="row" className="py-3 pr-4 font-semibold">
        {row.label}
        <span className="block text-xs font-normal text-ink-soft">{row.note}</span>
      </th>
      {cell("jev", row.jev)}
      {cell("laya", row.laya)}
      <td className="py-3">
        {row.winner === "tie" ? <span className="text-ink-soft">Tie</span> : (
          <span className="rounded-md bg-accent px-2.5 py-1 text-sm font-extrabold text-accent-ink">
            {row.winner === "jev" ? "Jev" : "Laya"}
          </span>
        )}
      </td>
    </tr>
  );
}
