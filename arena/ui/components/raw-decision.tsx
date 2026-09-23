"use client";

import { useState } from "react";
import type { StartEvent, StepEvent } from "@/lib/types";

/** The request that produced a decision, exactly as the model received it. */
export function requestFor(start: StartEvent | null, step: StepEvent) {
  return { model: start?.agent ?? "model", state: step.state, questions: start?.questions ?? "(not recorded)" };
}

const json = (value: unknown) => JSON.stringify(value, null, 2);

export function RawDecision({ start, step, open = false }: { start: StartEvent | null; step: StepEvent; open?: boolean }) {
  const [show, setShow] = useState(open);
  const answer = step.answers?.action;
  const chosen = answer?.probabilities?.[step.action];

  return (
    <div className="mt-4 border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-expanded={show}
        className="text-sm font-semibold text-ink-soft underline decoration-accent decoration-2 underline-offset-4 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marking"
      >
        {show ? "Hide" : "Show"} what was sent and returned
      </button>

      {show && (
        <div className="mt-3 grid gap-4 text-left lg:grid-cols-2">
          <figure className="grid gap-2">
            <figcaption className="text-sm font-extrabold">Sent to the model</figcaption>
            <pre className="max-h-80 overflow-auto rounded-md bg-surface p-3 text-xs leading-relaxed text-ink"><code>{json(requestFor(start, step))}</code></pre>
            <p className="text-xs text-ink-soft">
              The state is the situation in words. The questions name every option; the model can only answer with one of them.
            </p>
          </figure>
          <figure className="grid gap-2">
            <figcaption className="text-sm font-extrabold">Returned by the model</figcaption>
            <pre className="max-h-80 overflow-auto rounded-md bg-surface p-3 text-xs leading-relaxed text-ink"><code>{json(step.answers ?? { error: step.error ?? "no answer" })}</code></pre>
            <p className="text-xs text-ink-soft">
              {answer
                ? <>A probability for every option, not text. It played <b className="text-ink">{step.action}</b>{chosen !== undefined && <> at {Math.round(chosen * 100)}%</>}, in {Math.round(step.latency_ms)} ms.</>
                : <>This decision failed, so the game used its default move.</>}
            </p>
          </figure>
        </div>
      )}
    </div>
  );
}
