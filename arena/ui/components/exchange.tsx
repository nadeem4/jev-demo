"use client";

import { CaretRight } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { optionShares, type RequestQuestions } from "@/lib/decisions";
import { GAMES } from "@/lib/games";
import type { GameId, StepEvent } from "@/lib/types";
import { Code, CopyButton } from "./code";

/**
 * One model's reading of the decision on screen: how it split every option the
 * game offers, and directly beneath it the wire that produced that split.
 */
export function Exchange({ game, name, step, questions, waitingFor }: {
  game: GameId; name: string; step: StepEvent | null; questions: RequestQuestions | null; waitingFor: string;
}) {
  const request = step ? { state: step.state } : null;
  const response = step ? (step.answers ?? { error: step.error ?? "no answer" }) : null;

  return (
    <section className="min-w-0 border border-line bg-surface" aria-label={`${name}: how it split the options, and the raw exchange`}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-2.5">
        <h3 className="text-body font-extrabold">{name}</h3>
        {step ? (
          <p className="numeric text-micro text-ink-soft">
            decision {step.t} · {Math.round(step.latency_ms)} ms
            {step.retries ? ` · ${step.retries} retries` : ""}
            {step.error ? " · failed" : ""}
          </p>
        ) : (
          <p className="text-micro text-ink-soft">{waitingFor}</p>
        )}
      </header>

      {step && (
        <>
          <Options game={game} step={step} />

          <div className="grid gap-px bg-line lg:grid-cols-2">
            <div className="flex min-w-0 flex-col bg-surface">
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <h4 className="min-w-0 text-micro font-semibold text-ink-soft">
                  REQUEST · state <span className="font-normal">(what changes each decision)</span>
                </h4>
                <CopyButton value={request} />
              </div>
              <Code value={request} className="max-h-[13rem] grow" />
              {questions && <QuestionsPane questions={questions} />}
            </div>
            <div className="flex min-w-0 flex-col bg-surface">
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <h4 className="text-micro font-semibold text-ink-soft">RESPONSE</h4>
                <CopyButton value={response} />
              </div>
              <Code value={response} mark={step.action} className="max-h-[13rem] grow" />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/** Every option, with the weight this model gave it and the one it played. */
function Options({ game, step }: { game: GameId; step: StepEvent }) {
  const reduce = useReducedMotion();
  const options = GAMES[game].options;
  const shares = optionShares(options, step);

  return (
    <div className="border-b border-line px-4 py-3">
      <p className="text-micro text-ink-soft">How it split the options</p>
      <ol className="mt-2 grid gap-1">
        {shares.map(({ id, probability, played }) => {
          const { label, icon: Icon } = options.find((o) => o.id === id)!;
          return (
            <li key={id} className={`grid grid-cols-[1.1rem_1fr_2.75rem] items-center gap-3 px-1.5 py-1 ${played ? "bg-accent-wash" : ""}`}>
              <Icon size={16} weight="bold" aria-hidden className={played ? "text-accent" : "text-ink-soft"} />
              <span className="min-w-0">
                <span className={`block truncate text-micro ${played ? "font-extrabold text-ink" : "text-ink-soft"}`}>
                  {label}{played ? " · played" : ""}
                </span>
                <motion.span
                  className={`mt-1 block h-[3px] ${played ? "bg-accent" : "bg-line-strong"}`}
                  initial={false}
                  animate={{ width: `${Math.round((probability ?? 0) * 100)}%` }}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 190, damping: 26 }}
                />
              </span>
              <span className={`numeric text-right text-micro ${played ? "font-extrabold" : "text-ink-soft"}`}>
                {probability === null ? "–" : `${Math.round(probability * 100)}%`}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The other half of the same request, folded away because it never changes. */
function QuestionsPane({ questions }: { questions: RequestQuestions }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="border-t border-line">
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={id}
          className="flex min-w-0 items-center gap-1.5 text-micro font-semibold text-ink-soft hover:text-ink"
        >
          <CaretRight size={12} weight="bold" aria-hidden className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
          <span className="truncate">{questions.summary}</span>
        </button>
        {open && <CopyButton value={questions.body} />}
      </div>
      <div id={id}>{open && <Code value={questions.body} className="max-h-[13rem]" />}</div>
    </div>
  );
}
