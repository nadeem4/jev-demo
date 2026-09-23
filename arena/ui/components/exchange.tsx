"use client";

import type { StepEvent } from "@/lib/types";
import { Code, CopyButton } from "./code";

/** One model's wire for the decision on screen: what varied in the request, what came back. */
export function Exchange({ name, step, waitingFor }: { name: string; step: StepEvent | null; waitingFor: string }) {
  const request = step ? { state: step.state } : null;
  const response = step ? (step.answers ?? { error: step.error ?? "no answer" }) : null;

  return (
    <section className="min-w-0 border border-line bg-surface" aria-label={`${name}: request and response`}>
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
        <div className="grid gap-px bg-line lg:grid-cols-2">
          <div className="flex min-w-0 flex-col bg-surface">
            <div className="flex items-center justify-between gap-3 px-4 py-2">
              <h4 className="min-w-0 text-micro font-semibold text-ink-soft">
                REQUEST · state <span className="font-normal">(the envelope above completes it)</span>
              </h4>
              <CopyButton value={request} />
            </div>
            <Code value={request} className="max-h-[18rem] grow" />
          </div>
          <div className="flex min-w-0 flex-col bg-surface">
            <div className="flex items-center justify-between gap-3 px-4 py-2">
              <h4 className="text-micro font-semibold text-ink-soft">RESPONSE</h4>
              <CopyButton value={response} />
            </div>
            <Code value={response} mark={step.action} className="max-h-[18rem] grow" />
          </div>
        </div>
      )}
    </section>
  );
}
