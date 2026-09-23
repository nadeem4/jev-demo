"use client";

import type { DecisionRow } from "@/lib/decisions";
import { GAMES } from "@/lib/games";
import type { GameId } from "@/lib/types";

/** Every decision so far, newest first, both models on one row. Doubles as the scrubber. */
export function DecisionList({ game, names, rows, selected, onSelect }: {
  game: GameId; names: string[]; rows: DecisionRow[]; selected: number | null; onSelect: (t: number) => void;
}) {
  const label = (id: string | null) => GAMES[game].options.find((o) => o.id === id)?.label ?? "–";

  return (
    <section aria-labelledby="earlier-title" className="border border-line bg-surface">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-2.5">
        <h2 id="earlier-title" className="text-body font-extrabold">Earlier decisions</h2>
        <p className="text-micro text-ink-soft">newest first · pick one to pin the whole page to it</p>
      </header>

      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b border-line px-4 py-1.5 text-micro text-ink-soft">
        <span>#</span>
        {names.map((n, i) => <span key={n + i} className="truncate">{n}</span>)}
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-4 text-micro text-ink-soft">Decisions appear here as they are played.</p>
      ) : (
        <ol className="max-h-[22rem] overflow-auto">
          {rows.map((row) => (
            <li key={row.t}>
              <button
                type="button"
                onClick={() => onSelect(row.t)}
                aria-pressed={selected === row.t}
                className={`grid w-full grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-x-3 px-4 py-1.5 text-left transition-colors ${
                  selected === row.t ? "bg-accent-wash" : "hover:bg-sunk"
                }`}
              >
                <span className="numeric text-micro font-semibold text-ink-soft">{row.t}</span>
                {row.cells.map((cell, i) => (
                  <span key={i} className="flex min-w-0 items-baseline gap-1.5">
                    {cell.warned && <span aria-label="warning" title="This decision raised a warning" className="size-1.5 shrink-0 self-center rounded-full bg-danger" />}
                    <span className="truncate text-micro text-ink">{label(cell.action)}</span>
                    <span className="numeric ml-auto shrink-0 text-micro text-ink-soft">
                      {cell.confidence === null ? "" : `${Math.round(cell.confidence * 100)}%`}
                    </span>
                  </span>
                ))}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
