"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { tokenize, type Token } from "@/lib/highlight";
import type { PanelView } from "@/lib/views";
import { requestFor } from "./raw-decision";

const KIND: Record<Token["kind"], string> = {
  key: "text-ink-soft",
  string: "text-ink",
  number: "text-accent",
  punct: "text-ink-soft/70",
};

function Code({ value, mark }: { value: unknown; mark?: string }) {
  const json = JSON.stringify(value, null, 2);
  return (
    <pre className="max-h-[20rem] overflow-auto bg-sunk p-4 font-mono text-micro leading-relaxed">
      <code>
        {tokenize(json, mark).map((t, i) => (
          <span key={i} className={`${KIND[t.kind]} ${t.hit ? "bg-accent-wash font-semibold text-ink" : ""}`}>{t.text}</span>
        ))}
      </code>
    </pre>
  );
}

function CopyButton({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(JSON.stringify(value, null, 2)).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
      className="flex items-center gap-1.5 text-micro font-semibold text-ink-soft hover:text-ink"
    >
      {copied ? <Check size={14} weight="bold" aria-hidden /> : <Copy size={14} weight="bold" aria-hidden />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** One model's exchange for the current decision: what went in, what came back. */
function Exchange({ name, view }: { name: string; view: PanelView }) {
  const step = view.step;
  if (!step) return null;
  const request = requestFor(view.start, step);
  const response = step.answers ?? { error: step.error ?? "no answer" };

  return (
    <section className="min-w-0 border border-line bg-surface" aria-label={`${name}: request and response`}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-2.5">
        <h3 className="text-body font-extrabold">{name}</h3>
        <p className="numeric text-micro text-ink-soft">
          decision {step.t} · {Math.round(step.latency_ms)} ms
          {step.retries ? ` · ${step.retries} retries` : ""}
          {step.error ? " · failed" : ""}
        </p>
      </header>

      <div className="grid gap-px bg-line">
        <div className="min-w-0 bg-surface">
          <div className="flex items-center justify-between px-4 py-2">
            <h4 className="text-micro font-semibold text-ink-soft">Request</h4>
            <CopyButton value={request} />
          </div>
          <Code value={request} />
        </div>
        <div className="min-w-0 bg-surface">
          <div className="flex items-center justify-between px-4 py-2">
            <h4 className="text-micro font-semibold text-ink-soft">Response</h4>
            <CopyButton value={response} />
          </div>
          <Code value={response} mark={step.action} />
        </div>
      </div>
    </section>
  );
}

/** The exchange for both models, side by side, updating as the game plays. */
export function Inspector({ names, views }: { names: [string, string]; views: PanelView[] }) {
  if (!views.some((v) => v.step)) return null;
  return (
    <section id="inspector" className="mt-10 border-t-2 border-line-strong pt-8" aria-labelledby="inspector-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="inspector-title" className="text-h3 font-extrabold tracking-tight">What the models were sent, and what they answered</h2>
        <p className="text-micro text-ink-soft">Straight from the recording. The highlighted value is the move that was played.</p>
      </div>
      <div className="mt-5 grid gap-6">
        {views.map((view, i) => <Exchange key={names[i] + i} name={names[i]} view={view} />)}
      </div>
    </section>
  );
}
