"use client";

import { useState } from "react";
import type { Envelope } from "@/lib/decisions";
import { Code, CopyButton } from "./code";

/** The part of the request that is byte-identical on every decision, stated once. */
export function EnvelopeStrip({ envelope }: { envelope: Envelope | null }) {
  const [open, setOpen] = useState(false);
  if (!envelope) return null;

  return (
    <section className="border border-line bg-surface" aria-labelledby="envelope-title">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-2.5">
        <h2 id="envelope-title" className="text-body font-extrabold">The envelope</h2>
        <p className="text-micro text-ink-soft">sent unchanged with every decision below</p>
      </header>

      <div className="px-4 py-3">
        {envelope.instructions.map((text) => (
          <p key={text} className="text-micro leading-relaxed text-ink">{text}</p>
        ))}
        {envelope.criteria.length > 0 && (
          <dl className="mt-3 grid gap-1">
            {envelope.criteria.map(({ id, text }) => (
              <div key={id} className="flex flex-wrap gap-x-2 text-micro">
                <dt className="font-mono font-semibold text-accent">{id}</dt>
                <dd className="text-ink-soft">{text}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="envelope-body"
            className="text-micro font-semibold text-ink-soft underline decoration-accent decoration-2 underline-offset-4 hover:text-ink"
          >
            {open ? "Hide exact body" : "Show exact body"}
          </button>
          {open && <CopyButton value={envelope.body} />}
        </div>
      </div>

      {open && <div id="envelope-body"><Code value={envelope.body} /></div>}
    </section>
  );
}
