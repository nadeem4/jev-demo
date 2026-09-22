"use client";

import {
  ArrowBendUpLeft, ArrowBendUpRight, ArrowUp, CaretDoubleDown, CaretDoubleUp, WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { ACTIONS, AGENTS, STATE_LABELS, type AgentId } from "@/lib/agents";
import { concerns, tone, type Tone } from "@/lib/insights";
import type { Action, EndEvent, StepEvent } from "@/lib/types";

const ICONS: Record<Action, Icon> = {
  LANE_LEFT: ArrowBendUpLeft,
  IDLE: ArrowUp,
  LANE_RIGHT: ArrowBendUpRight,
  FASTER: CaretDoubleUp,
  SLOWER: CaretDoubleDown,
};

const TONE_CLASS: Record<Tone, string> = {
  danger: "text-danger font-semibold",
  clear: "text-clear",
  muted: "text-ink-soft",
  normal: "text-ink",
};

// Order the road description the way a driver scans it: ahead first, then the sides.
const STATE_ORDER = ["ahead_in_your_lane", "left_lane", "right_lane", "your_lane", "your_speed"];

export interface PanelView {
  step: StepEvent | null;
  end: EndEvent | null;
  failed: string | null;
  status: string;
  waiting: boolean;
  started: boolean;
}

export function ModelPanel({ agent, view, align }: { agent: AgentId; view: PanelView; align: "left" | "right" }) {
  const reduce = useReducedMotion();
  const { step, end, failed } = view;
  const meta = AGENTS[agent];
  const probs = step?.answers?.action?.probabilities ?? {};
  const issues = step ? concerns(step.state, step.action, step.answers) : [];

  return (
    <section aria-label={`${meta.name}: what it sees and decides`} className={align === "right" ? "lg:text-right" : ""}>
      <header className="pb-5">
        <h2 className="text-4xl font-extrabold leading-none tracking-tight">{meta.name}</h2>
        <p className="mt-2 text-sm text-ink-soft">{meta.about}</p>
        <p className="mt-3 min-h-6 text-base font-semibold" aria-live="polite">
          <StatusLine view={view} name={meta.name} />
        </p>
      </header>

      <div className="border-t border-line py-5">
        <h3 className="text-lg font-extrabold">What it sees</h3>
        {step ? (
          <dl className="mt-3 grid gap-2">
            {STATE_ORDER.filter((k) => step.state[k]).map((k) => (
              <div key={k} className={`grid gap-0.5 ${align === "right" ? "lg:justify-items-end" : ""}`}>
                <dt className="text-sm text-ink-soft">{STATE_LABELS[k] ?? k}</dt>
                <dd className={`text-base leading-snug ${TONE_CLASS[tone(step.state[k])]}`}>{step.state[k]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 max-w-[40ch] text-ink-soft lg:inline-block">
            {failed ?? "Press Play. Each second, the text this model reads about the road appears here."}
          </p>
        )}
      </div>

      <div className="border-t border-line py-5">
        <h3 className="text-lg font-extrabold">What it decides</h3>
        <ol className="mt-3 grid gap-1.5">
          {ACTIONS.map(({ id, label }) => {
            const Icon = ICONS[id];
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
            {step.error && <span className="block text-danger">This decision failed ({step.error}), so the car kept its lane.</span>}
          </p>
        )}
        {end && !end.crashed && <p className="mt-2 text-sm font-semibold text-clear">Made it through all {end.steps} seconds without a crash.</p>}
      </div>
    </section>
  );
}

function StatusLine({ view, name }: { view: PanelView; name: string }) {
  if (view.failed) return <span className="text-danger">Could not start</span>;
  if (view.end?.crashed) return <span className="text-danger">Crashed after {view.end.steps} seconds</span>;
  if (view.end) return <span className="text-clear">Finished</span>;
  if (view.waiting) return <span className="text-ink-soft">{name} is deciding…</span>;
  if (view.step) return <span>Driving</span>;
  if (view.started) return <span className="text-ink-soft">{view.status || "Starting…"}</span>;
  return <span className="text-ink-soft">Ready</span>;
}
