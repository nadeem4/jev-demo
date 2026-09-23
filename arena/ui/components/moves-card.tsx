"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { GAMES, type AgentInfo } from "@/lib/games";
import { concerns } from "@/lib/insights";
import type { EndEvent, GameId } from "@/lib/types";
import type { PanelView } from "@/lib/views";

/** What each model just played, one row per model, in the same order as the boards. */
export function MovesCard({ game, agents, views, decision }: {
  game: GameId; agents: AgentInfo[]; views: PanelView[]; decision: number | null;
}) {
  return (
    <section aria-labelledby="moves-title" className="border border-line bg-surface">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-3">
        <h2 id="moves-title" className="text-body font-extrabold">
          {decision === null ? "No decision yet" : <>Decision <span className="numeric">{decision}</span></>}
        </h2>
        <p className="text-micro text-ink-soft">what each one just played</p>
      </header>
      <div className="grid gap-px bg-line">
        {views.map((view, i) => <ModelMove key={agents[i].id + i} game={game} agent={agents[i]} view={view} />)}
      </div>
    </section>
  );
}

function ModelMove({ game, agent, view }: { game: GameId; agent: AgentInfo; view: PanelView }) {
  const reduce = useReducedMotion();
  const info = GAMES[game];
  const { step, end } = view;
  const probs = step?.answers?.action?.probabilities ?? {};
  const issues = step ? concerns(game, step.state, step.action, step.answers, step.frame) : [];
  const chosen = info.options.find((o) => o.id === step?.action);
  const confidence = step ? probs[step.action] : undefined;

  return (
    <article className="bg-surface px-4 py-4" aria-label={`${agent.name}: what it played`}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-lead font-extrabold leading-none tracking-tight">{agent.name}</h3>
        <p className="numeric text-micro text-ink-soft">
          {step ? <>{Math.round(step.latency_ms)} ms{step.retries ? ` · ${step.retries} retries` : ""}</> : agent.about}
        </p>
      </header>

      {step && chosen ? (
        <>
          <p className="mt-3 flex items-baseline gap-3">
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

          <p className="mt-4 text-micro text-ink-soft">How it split the options</p>
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
        </>
      ) : (
        <p className="mt-3 max-w-[38ch] text-body text-ink-soft">
          {view.failed ?? (view.started ? view.status || "Starting…" : "Press Play. Every decision this model makes appears here.")}
        </p>
      )}

      {end && <p className="mt-4 border-t border-line pt-3 text-body font-semibold"><EndLine game={game} end={end} /></p>}
    </article>
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
