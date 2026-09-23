"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { GAMES, type AgentInfo } from "@/lib/games";
import { concerns, tone, type Tone } from "@/lib/insights";
import type { EndEvent, GameId } from "@/lib/types";
import type { PanelView } from "@/lib/views";

export type { PanelView };

const TONE_CLASS: Record<Tone, string> = {
  danger: "text-danger font-semibold",
  clear: "text-clear",
  muted: "text-ink-soft",
  normal: "text-ink",
};


export function ModelPanel({ game, agent, view, align, rawUrl }: { game: GameId; agent: AgentInfo; view: PanelView; align: "left" | "right"; rawUrl?: string | null }) {
  const reduce = useReducedMotion();
  const info = GAMES[game];
  const { step, end, failed } = view;
  const probs = step?.answers?.action?.probabilities ?? {};
  const issues = step ? concerns(game, step.state, step.action, step.answers, step.frame) : [];

  return (
    <section aria-label={`${agent.name}: what it sees and decides`} className={align === "right" ? "lg:text-right" : ""}>
      <header className="pb-5">
        <h2 className="text-4xl font-extrabold leading-none tracking-tight">{agent.name}</h2>
        <p className="mt-2 text-sm text-ink-soft">{agent.about}</p>
        <p className="mt-3 min-h-6 text-base font-semibold" aria-live="polite">
          <StatusLine view={view} name={agent.name} />
        </p>
      </header>

      <div className="border-t border-line py-5">
        <h3 className="text-lg font-extrabold">What it sees</h3>
        {step ? (
          <dl className="mt-3 grid gap-2">
            {info.stateOrder.filter((k) => step.state[k]).map((k) => (
              <div key={k} className={`grid gap-0.5 ${align === "right" ? "lg:justify-items-end" : ""}`}>
                <dt className="text-sm text-ink-soft">{info.stateLabels[k] ?? k}</dt>
                <dd className={`text-base leading-snug ${TONE_CLASS[tone(step.state[k])]}`}>{step.state[k]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 max-w-[40ch] text-ink-soft lg:inline-block">
            {failed ?? "Press Play. Before every decision, the text this model reads appears here."}
          </p>
        )}
      </div>

      <div className="border-t border-line py-5">
        <h3 className="text-lg font-extrabold">What it decides</h3>
        <ol className="mt-3 grid gap-1.5">
          {info.options.map(({ id, label, icon: Icon }) => {
            const p = probs[id];
            const chosen = step?.action === id;
            return (
              <li
                key={id}
                className={`grid grid-cols-[1.25rem_1fr_3.25rem] items-center gap-3 rounded-md px-2.5 py-1.5 text-left ${
                  chosen ? "bg-accent text-accent-ink" : ""
                }`}
              >
                <Icon size={20} weight="bold" aria-hidden />
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{label}</span>
                  <motion.span
                    className={`mt-1 block h-1.5 rounded-full ${chosen ? "bg-accent-ink" : "bg-ink-soft/60"}`}
                    initial={false}
                    animate={{ width: `${Math.round((p ?? 0) * 100)}%` }}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 24 }}
                  />
                </div>
                <span className="text-right text-base font-extrabold">{p === undefined ? "-" : `${Math.round(p * 100)}%`}</span>
              </li>
            );
          })}
        </ol>

        {issues.length > 0 && (
          <ul className="mt-3 grid gap-1.5 text-left">
            {issues.map((issue) => (
              <li key={issue} className="flex items-start gap-2 text-sm font-semibold text-danger">
                <WarningCircle size={18} weight="bold" className="mt-px shrink-0" aria-hidden />
                {issue}
              </li>
            ))}
          </ul>
        )}

        {step && (
          <p className="mt-4 text-sm text-ink-soft">
            Decision {step.t} took <span className="font-semibold text-ink">{Math.round(step.latency_ms)} ms</span>
            {step.error && <span className="block text-danger">This decision failed ({step.error}), so the game used its default move.</span>}
          </p>
        )}
        {end && <p className="mt-2 text-sm font-semibold"><EndLine game={game} end={end} /></p>}
        {rawUrl && (
          <p className="mt-3 text-sm">
            <a href={rawUrl} target="_blank" rel="noreferrer" className="text-ink-soft underline decoration-accent decoration-2 underline-offset-4 hover:text-ink">
              Raw JSON: every situation, answer and probability in this game
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

function EndLine({ game, end }: { game: GameId; end: EndEvent }) {
  if (game === "highway") return end.crashed
    ? <span className="text-danger">Crashed after {end.steps} seconds.</span>
    : <span className="text-clear">Made it through all {end.steps} seconds without a crash.</span>;
  if (game === "snake") return end.died
    ? <span className="text-danger">Died after eating {String(end.food_eaten)}.</span>
    : <span className="text-clear">Survived, ate {String(end.food_eaten)}. Ended for taking too long without food.</span>;
  return <span>{String(end.wins)} won, {String(end.losses)} lost, {String(end.draws)} drawn. Matched basic strategy on {Math.round(Number(end.basic_strategy_match) * 100)}% of decisions.</span>;
}

function StatusLine({ view, name }: { view: PanelView; name: string }) {
  if (view.failed) return <span className="text-danger">Could not start</span>;
  if (view.end) return <span>Finished</span>;
  if (view.waiting) return <span className="text-ink-soft">{name} is deciding…</span>;
  if (view.step) return <span>Playing</span>;
  if (view.started) return <span className="text-ink-soft">{view.status || "Starting…"}</span>;
  return <span className="text-ink-soft">Ready</span>;
}
