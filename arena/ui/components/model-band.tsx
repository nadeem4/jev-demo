"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { GAMES, type AgentInfo } from "@/lib/games";
import { concerns, tone, type Tone } from "@/lib/insights";
import type { EndEvent, GameId } from "@/lib/types";
import type { PanelView } from "@/lib/views";

const TONE: Record<Tone, string> = {
  danger: "text-danger font-semibold",
  clear: "text-clear",
  muted: "text-ink-soft",
  normal: "text-ink",
};

/** The model on screen, whole: its board, what it played, and the denser reading beside it. */
export function ModelBand({ game, agent, view, board }: {
  game: GameId; agent: AgentInfo; view: PanelView; board: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const info = GAMES[game];
  const { step, end } = view;
  const probs = step?.answers?.action?.probabilities ?? {};
  const issues = step ? concerns(game, step.state, step.action, step.answers, step.frame) : [];
  const chosen = info.options.find((o) => o.id === step?.action);
  const confidence = step ? probs[step.action] : undefined;

  return (
    <section className="border border-line bg-surface" aria-label={`${agent.name}: its board, and what it played`}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-3">
        <h2 className="text-lead font-extrabold leading-none tracking-tight">{agent.name}</h2>
        <p className="numeric text-micro text-ink-soft">
          {step
            ? <>decision {step.t} · {Math.round(step.latency_ms)} ms{step.retries ? ` · ${step.retries} retries` : ""}</>
            : agent.about}
        </p>
      </header>

      <div className="grid lg:grid-cols-2">
        <figure className="grid content-start justify-items-center gap-2 border-b border-line px-4 py-4 lg:border-r lg:border-b-0">
          {board}
          <dl className="mt-1 grid w-full grid-cols-2 gap-2 border-t border-line pt-2 text-center">
            {info.stats(step, end).map((s) => (
              <div key={s.label}>
                <dt className="text-micro text-ink-soft">{s.label}</dt>
                <dd className={`numeric text-body font-extrabold ${s.danger ? "text-danger" : ""}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
        </figure>

        <div className="min-w-0">
          <div className="px-4 py-4">
            {step && chosen ? (
              <>
                <p className="text-micro text-ink-soft">played</p>
                <p className="mt-1 flex items-baseline gap-3">
                  <span className="text-h3 font-extrabold leading-none">{chosen.label}</span>
                  {confidence !== undefined && <span className="numeric text-body font-semibold text-ink-soft">{Math.round(confidence * 100)}%</span>}
                </p>
                <div className="mt-2 h-[6px] bg-sunk" aria-hidden>
                  <motion.div
                    className="h-full bg-accent"
                    initial={false}
                    animate={{ width: `${Math.round((confidence ?? 0) * 100)}%` }}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 190, damping: 26 }}
                  />
                </div>
                {step.error && <p className="mt-2 text-micro font-semibold text-danger">This call failed ({step.error}); the game used its default move.</p>}
                {issues.length > 0 && (
                  <ul className="mt-3 grid gap-1.5">
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
              <p className="max-w-[38ch] text-body text-ink-soft">
                {view.failed ?? (view.started ? view.status || "Starting…" : "Press Play. Every decision this model makes appears here.")}
              </p>
            )}
          </div>

          {step && chosen && (
            <div className="grid gap-x-8 gap-y-4 border-t border-line px-4 py-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="min-w-0">
                <p className="text-micro text-ink-soft">How it split the options</p>
                <ol className="mt-2 grid gap-1">
                  {info.options.map(({ id, label, icon: Icon }) => {
                    const p = probs[id];
                    const isChoice = step.action === id;
                    return (
                      <li key={id} className={`grid grid-cols-[1.1rem_1fr_2.75rem] items-center gap-3 px-1.5 py-1 ${isChoice ? "bg-accent-wash" : ""}`}>
                        <Icon size={16} weight="bold" aria-hidden className={isChoice ? "text-accent" : "text-ink-soft"} />
                        <span className="min-w-0">
                          <span className={`block truncate text-micro ${isChoice ? "font-extrabold text-ink" : "text-ink-soft"}`}>{label}</span>
                          <motion.span
                            className={`mt-1 block h-[3px] ${isChoice ? "bg-accent" : "bg-line-strong"}`}
                            initial={false}
                            animate={{ width: `${Math.round((p ?? 0) * 100)}%` }}
                            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 190, damping: 26 }}
                          />
                        </span>
                        <span className={`numeric text-right text-micro ${isChoice ? "font-extrabold" : "text-ink-soft"}`}>
                          {p === undefined ? "–" : `${Math.round(p * 100)}%`}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="min-w-0">
                <p className="text-micro text-ink-soft">What it read before deciding</p>
                <dl className="mt-2 grid gap-1">
                  {info.stateOrder.filter((k) => step.state[k]).map((k) => (
                    <div key={k} className="flex flex-wrap items-baseline gap-x-2">
                      <dt className="text-micro text-ink-soft">{info.stateLabels[k] ?? k}</dt>
                      <dd className={`text-micro leading-snug ${TONE[tone(step.state[k])]}`}>{step.state[k]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>

      {end && <p className="border-t border-line px-4 py-3 text-body font-semibold"><EndLine game={game} end={end} /></p>}
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
