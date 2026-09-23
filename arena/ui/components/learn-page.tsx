import {
  provenanceLabel, splitCode,
  type Answer as AnswerData, type Claim, type Note, type Row, type Table,
} from "@/lib/learn";
import { LearnNav } from "./learn-nav";

/** Shared shell for the Learn pages: title, standfirst, sub-navigation. */
export function LearnPage({ title, intro, checked, children }: {
  title: string; intro: string; checked?: string; children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-20 pt-8 md:px-8">
      <h1 className="text-h1 font-extrabold leading-none tracking-tight">{title}</h1>
      <p className="mt-3 max-w-[60ch] text-lead leading-relaxed text-ink-soft">{intro}</p>
      <LearnNav />
      {children}
      {checked && (
        <p className="mt-16 border-t border-line pt-4 text-micro text-ink-soft">
          Both models are days old and changing. Everything here was checked on {checked} against the sources listed above.
        </p>
      )}
    </main>
  );
}

/** An inline code span, in the site's mono face. */
export function Mono({ children }: { children: React.ReactNode }) {
  return <code className="rounded-sm bg-sunk px-1 font-mono text-[0.9em]">{children}</code>;
}

/** Prose with `backticked` spans set in monospace. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {splitCode(text).map((piece, i) =>
        piece.code
          ? <Mono key={i}>{piece.text}</Mono>
          : <span key={i}>{piece.text}</span>,
      )}
    </>
  );
}

/** Where a claim came from: metadata, so it is quiet and never emphasised. */
export function Mark({ claim }: { claim: Claim }) {
  const label = provenanceLabel(claim);
  if (!label) return null;
  return (
    <span className="ml-2 rounded-sm border border-line bg-sunk px-1.5 py-px align-middle font-mono text-micro font-normal text-ink-soft">
      {label}
    </span>
  );
}

/** One claim as a paragraph, with its source beside it. */
export function ClaimLine({ claim, className = "" }: { claim: Claim; className?: string }) {
  return (
    <p className={className}><Rich text={claim.text} /><Mark claim={claim} /></p>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 id={id} className="max-w-[24ch] text-h2 font-extrabold tracking-tight">{title}</h2>
      <div className="mt-4 grid max-w-[70ch] gap-4 text-body leading-relaxed">{children}</div>
    </section>
  );
}

/** One of the six questions, numbered so the parallel between the model pages is visible. */
export function QuestionSection({ n, id, title, children }: {
  n: number; id: string; title: string; children: React.ReactNode;
}) {
  return (
    <section className="mt-14 border-t-2 border-line pt-6" aria-labelledby={id}>
      <div className="flex items-baseline gap-3">
        <span aria-hidden className="numeric text-h2 font-extrabold leading-none text-line-strong">{n}</span>
        <h2 id={id} className="max-w-[24ch] text-h3 font-extrabold tracking-tight">{title}</h2>
      </div>
      <div className="mt-4 grid gap-4 text-body leading-relaxed">{children}</div>
    </section>
  );
}

export function Notes({ notes, className = "" }: { notes: Note[]; className?: string }) {
  return (
    <ul className={`grid max-w-[70ch] gap-3 ${className}`}>
      {notes.map((note, i) => (
        <li key={i} className="border-l-2 border-line pl-4">
          {note.lead && <b className="mr-1">{note.lead}</b>}
          {note.claims.map((claim, j) => (
            <span key={j}>{j > 0 && " "}<Rich text={claim.text} /><Mark claim={claim} /></span>
          ))}
        </li>
      ))}
    </ul>
  );
}

export function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="grid max-w-[70ch] gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr]">
      {rows.map(({ label, claim }) => (
        <div key={label} className="contents">
          <dt className="font-semibold text-ink-soft">{label}</dt>
          <dd><Rich text={claim.text} /><Mark claim={claim} /></dd>
        </div>
      ))}
    </dl>
  );
}

export function DataTable({ table, caption }: { table: Table; caption?: string }) {
  return (
    <figure className="grid min-w-0 gap-2">
      {caption && (
        <figcaption className="text-micro font-semibold text-ink-soft">
          {caption}
          {table.from && <Mark claim={{ text: "", from: table.from }} />}
        </figcaption>
      )}
      <div className="min-w-0 overflow-x-auto border border-line bg-surface">
        <table className="w-full min-w-[520px] border-collapse text-left text-micro">
          <thead>
            <tr className="border-b border-line">
              {table.head.map((h) => <th key={h} scope="col" className="px-3 py-2 font-extrabold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row[0]} className="border-b border-line last:border-0 align-top">
                {row.map((cell, i) => (
                  <td key={i} className={`px-3 py-2 ${i === 0 ? "font-mono font-semibold" : "text-ink-soft"}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** One model's answer to one question: the same shape on the model page and side by side. */
export function Answer({ answer, compact = false }: { answer: AnswerData; compact?: boolean }) {
  return (
    <div className={`grid gap-4 ${compact ? "text-micro" : "text-body"} leading-relaxed`}>
      {answer.headline && (
        <p className="max-w-[60ch] font-extrabold">
          <Rich text={answer.headline.text} /><Mark claim={answer.headline} />
        </p>
      )}
      {(compact ? answer.body?.slice(0, 1) : answer.body)?.map((claim, i) => (
        <ClaimLine key={i} claim={claim} className="max-w-[70ch]" />
      ))}
      {answer.rows && <Rows rows={answer.rows} />}
      {answer.table && <DataTable table={answer.table} caption="Three checkpoints" />}
      {answer.bullets && <Notes notes={answer.bullets} />}
    </div>
  );
}

export function Sources({ items }: { items: { text: string; href: string }[] }) {
  return (
    <ul className="grid max-w-[70ch] gap-2 text-micro text-ink-soft">
      {items.map(({ text, href }) => (
        <li key={href}>
          <a href={href} className="underline decoration-accent decoration-2 underline-offset-4 hover:text-ink">
            <Rich text={text} />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function Source({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} className="underline decoration-accent decoration-2 underline-offset-4">{children}</a>;
}
