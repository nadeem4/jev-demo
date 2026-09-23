"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { GAMES, type AgentInfo } from "@/lib/games";
import { concerns, tone, type Tone } from "@/lib/insights";
import type { EndEvent, GameId } from "@/lib/types";
import type { PanelView } from "@/lib/views";

export type { PanelView };

const TONE: Record<Tone, string> = {
  danger: "text-danger font-semibold",
  clear: "text-clear",
  muted: "text-ink-soft",
  normal: "text-ink",
};

export function ModelPanel({ game, agent, view, align }: { game: GameId; agent: AgentInfo; view: PanelView; align: "left" | "right" }) {
  const reduce = useReducedMotion();
  const info = GAMES[game];
  const { step, end } = view;
  const probs = step?.answers?.action?.probabilities ?? {};
  const issues = step ? concerns(game, step.state, step.action, step.answers, step.frame) : [];
  const chosen = info.options.find((o) => o.id === step?.action);
  const confidence = step ? probs[step.action] : undefined;
  const right = align === "right";

  return (
    <section aria-label={`${agent.name}: what it reads and decides`} className={right ? "lg:text-right" : ""}>
      <header className="border-b-2 border-line-strong pb-4">
        <h2 className="text-h2 font-extrabold leading-none tracking-tight">{agent.name}</h2>
        <p className="mt-2 text-micro text-ink-soft">{agent.about}</p>
      </header>

      {/* The decision leads: what it played, how sure it was, how long it took. */}
      <div className="border-b border-line py-5">
        <p className="text-micro text-ink-soft">Its move</p>
        {step && chosen ? (
          <>
            <p className={`mt-2 flex items-baseline gap-3 ${right ? "lg:justify-end" : ""}`}>
              <span className="text-h3 font-extrabold leading-none">{chosen.label}</span>
              {confidence !== undefined && <span className="numeric text-lead font-semibold text-ink-soft">{Math.round(confidence * 100)}%</span>}
            </p>
            <p className="numeric mt-2 text-micro text-ink-soft">
              decision {step.t} · {Math.round(step.latency_ms)} ms{step.retries ? ` · ${step.retries} retries` : ""}
            </p>
            {step.error && <p className="mt-2 text-micro font-semibold text-danger">This call failed ({step.error}); the game used its default move.</p>}
            {issues.length > 0 && (
              <ul className={`mt-3 grid gap-1.5 text-left ${right ? "lg:justify-items-end" : ""}`}>
                {issues.map((issue) => (
                  <li key={issue} className="flex items-start gap-2 text-micro font-semibold text-danger">
                    <WarningCircle size={16} weight="bold" className="mt-px shrink-0" aria-hidden />
                    {issue}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-2 max-w-[38ch] text-ink-soft lg:inline-block">
            {view.failed ?? (view.started ? view.status || "Starting…" : "Press Play. Every decision this model makes appears here.")}
          </p>
        )}
      </div>

      <div className="border-b border-line py-5">
        <p className="text-micro text-ink-soft">How it split the options</p>
        <ol className="mt-3 grid gap-1">
          {info.options.map(({ id, label, icon: Icon }) => {
            const p = probs[id];
            const isChoice = step?.action === id;
            return (
              <li
                key={id}
                className={`grid items-center gap-3 px-1.5 py-1.5 ${isChoice ? "bg-accent-wash" : ""} ${
                  right ? "grid-cols-[2.75rem_1fr_1.1rem]" : "grid-cols-[1.1rem_1fr_2.75rem]"
                }`}
              >
                {right && <span className={`numeric text-micro ${isChoice ? "font-extrabold" : "text-ink-soft"}`}>{p === undefined ? "–" : `${Math.round(p * 100)}%`}</span>}
                {!right && <Icon size={18} weight="bold" aria-hidden className={isChoice ? "text-accent" : "text-ink-soft"} />}
                <span className="min-w-0">
                  <span className={`block truncate text-micro ${isChoice ? "font-extrabold text-ink" : "text-ink-soft"}`}>{label}</span>
                  <motion.span
                    className={`mt-1 block h-[3px] ${right ? "ml-auto" : ""} ${isChoice ? "bg-accent" : "bg-line-strong"}`}
                    initial={false}
                    animate={{ width: `${Math.round((p ?? 0) * 100)}%` }}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 190, damping: 26 }}
                  />
                </span>
                {right
                  ? <Icon size={18} weight="bold" aria-hidden className={isChoice ? "text-accent" : "text-ink-soft"} />
                  : <span className={`numeric text-right text-micro ${isChoice ? "font-extrabold" : "text-ink-soft"}`}>{p === undefined ? "–" : `${Math.round(p * 100)}%`}</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="py-5">
        <p className="text-micro text-ink-soft">What it read before deciding</p>
        {step ? (
          <dl className="mt-3 grid gap-2.5">
            {info.stateOrder.filter((k) => step.state[k]).map((k) => (
              <div key={k} className={`grid gap-0.5 ${right ? "lg:justify-items-end" : ""}`}>
                <dt className="text-micro text-ink-soft">{info.stateLabels[k] ?? k}</dt>
                <dd className={`text-body leading-snug ${TONE[tone(step.state[k])]}`}>{step.state[k]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-micro text-ink-soft">The situation, in the exact words the model is given.</p>
        )}
      </div>

      {end && <p className="border-t border-line pt-4 text-body font-semibold"><EndLine game={game} end={end} /></p>}
    </section>
  );
}

function EndLine({ game, end }: { game: GameId; end: EndEvent }) {
  if (game === "highway") return end.crashed
    ? <span className="text-danger">Crashed after {end.steps} seconds.</span>
    : <span className="text-clear">Survived all {end.steps} seconds.</span>;
  if (game === "snake") return end.died
    ? <span className="text-danger">Died after eating {String(end.food_eaten)}.</span>
    : <span className="text-clear">Survived, ate {String(end.food_eaten)}, then ran out of time without food.</span>;
  return <span>{String(end.wins)} won, {String(end.losses)} lost, {String(end.draws)} drawn; {Math.round(Number(end.basic_strategy_match) * 100)}% of moves matched the best play.</span>;
}
