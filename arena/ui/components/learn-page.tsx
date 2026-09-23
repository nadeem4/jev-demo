import { LearnNav } from "./learn-nav";

/** Shared shell for the Learn pages: title, standfirst, sub-navigation. */
export function LearnPage({ title, intro, checked, children }: {
  title: string; intro: string; checked?: string; children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-20 pt-8 md:px-8">
      <h1 className="text-4xl font-extrabold leading-none tracking-tight md:text-5xl">{title}</h1>
      <p className="mt-3 max-w-[64ch] text-lg leading-relaxed text-ink-soft">{intro}</p>
      <LearnNav />
      {children}
      {checked && (
        <p className="mt-12 border-t border-line pt-4 text-sm text-ink-soft">
          Both models are days old and changing. Everything here was checked on {checked} against the sources listed above.
        </p>
      )}
    </main>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-3xl font-extrabold tracking-tight">{title}</h2>
      <div className="mt-4 grid max-w-[70ch] gap-4 text-lg leading-relaxed">{children}</div>
    </section>
  );
}

export function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-[max-content_1fr]">
      {rows.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="font-semibold text-ink-soft">{key}</dt>
          <dd className="max-w-[60ch]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Source({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} className="underline decoration-accent decoration-2 underline-offset-4">{children}</a>;
}
