"use client";

import { useId, useState } from "react";
import type { StartEvent, StepEvent } from "@/lib/types";
import { Code, CopyButton } from "./code";

/** The request that produced a decision, exactly as the model received it. */
export function requestFor(start: StartEvent | null, step: StepEvent) {
  return { state: step.state, questions: start?.questions ?? "(not recorded)" };
}

export function RawDecision({ start, step, open = false }: { start: StartEvent | null; step: StepEvent; open?: boolean }) {
  const [toggled, setToggled] = useState<boolean | null>(null);
  const show = toggled ?? open;
  const id = useId();
  const answer = step.answers?.action;
  const chosen = answer?.probabilities?.[step.action];
  const request = requestFor(start, step);
  const response = step.answers ?? { error: step.error ?? "no answer" };

  return (
    <div>
      <div className="px-4 py-2">
        <button
          type="button"
          onClick={() => setToggled(!show)}
          aria-expanded={show}
          aria-controls={id}
          className="text-micro font-semibold text-ink-soft underline decoration-accent decoration-2 underline-offset-4 hover:text-ink"
        >
          {show ? "Hide" : "Show"} what was sent and returned
        </button>
      </div>

      <div id={id}>
        {show && (
          <div className="grid gap-px border-t border-line bg-line lg:grid-cols-2">
            <figure className="flex min-w-0 flex-col bg-surface">
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <figcaption className="min-w-0 text-micro font-semibold text-ink-soft">
                  REQUEST · state <span className="font-normal">and the questions</span>
                </figcaption>
                <CopyButton value={request} />
              </div>
              <Code value={request} className="max-h-[22rem] grow" />
            </figure>
            <figure className="flex min-w-0 flex-col bg-surface">
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <figcaption className="text-micro font-semibold text-ink-soft">RESPONSE</figcaption>
                <CopyButton value={response} />
              </div>
              <Code value={response} mark={step.action} className="max-h-[22rem] grow" />
              <p className="px-4 py-2 text-micro text-ink-soft">
                {answer
                  ? <>A probability for every option, not text. It played <b className="text-ink">{step.action}</b>{chosen !== undefined && <> at {Math.round(chosen * 100)}%</>}, in {Math.round(step.latency_ms)} ms.</>
                  : <>This decision failed, so the game used its default move.</>}
              </p>
            </figure>
          </div>
        )}
      </div>
    </div>
  );
}
