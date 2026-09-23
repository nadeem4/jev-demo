import type { Metadata } from "next";
import Link from "next/link";
import { Answer, ClaimLine, LearnPage, Notes, Section, Sources } from "@/components/learn-page";
import { JEV, LAYA, pairAnswers, type Model } from "@/lib/learn";

export const metadata: Metadata = { title: "Jev and Laya side by side | Decision Arena" };

const link = "font-semibold underline decoration-accent decoration-2 underline-offset-4";

export default function Page() {
  const pairs = pairAnswers(JEV, LAYA);
  const sources = [...JEV.sources, ...LAYA.sources.filter((s) => !JEV.sources.some((j) => j.href === s.href))];

  return (
    <LearnPage
      title="Side by side"
      intro="The same six questions, the same answers as the two model pages, in two columns."
      checked="23 September 2026"
    >
      <Section title="How to read this">
        <p>
          Nothing here is written separately. Every answer below is the short answer from the{" "}
          <Link href="/learn/jev/" prefetch={false} className={link}>Jev</Link> or{" "}
          <Link href="/learn/laya/" prefetch={false} className={link}>Laya</Link> page, set beside its opposite number;
          those pages carry the rest. Where a column is short, that is the finding: one of the two has published nothing.
        </p>
      </Section>

      {pairs.map(({ question, jev, laya, unpublished }, i) => (
        <section key={question.id} className="mt-14 border-t-2 border-line pt-6" aria-labelledby={`q-${question.id}`}>
          <div className="flex items-baseline gap-3">
            <span aria-hidden className="numeric text-h2 font-extrabold leading-none text-line-strong">{i + 1}</span>
            <h2 id={`q-${question.id}`} className="max-w-[28ch] text-h3 font-extrabold tracking-tight">{question.title}</h2>
          </div>

          {unpublished && (
            <p className="mt-3 max-w-[70ch] text-micro text-ink-soft">
              {unpublished === "jev" ? "TypeSafe" : "Convai"} has published no answer to this one;{" "}
              {unpublished === "jev" ? "Convai" : "TypeSafe"} has.
            </p>
          )}

          <div className="mt-4 grid gap-px border border-line bg-line md:grid-cols-2">
            <Column model={JEV}><Answer answer={jev} compact /></Column>
            <Column model={LAYA}><Answer answer={laya} compact /></Column>
          </div>
        </section>
      ))}

      <section className="mt-14 border-t-2 border-line pt-6" aria-labelledby="measured">
        <h2 id="measured" className="text-h3 font-extrabold tracking-tight">What we measured</h2>
        <p className="mt-3 max-w-[70ch] text-body leading-relaxed">
          Three games, the same seeds and the same text to both models, everything recorded. The per-metric table is on
          the <Link href="/scorecard/" prefetch={false} className={link}>Scorecard</Link>, with the raw numbers on{" "}
          <Link href="/results/" prefetch={false} className={link}>Results</Link>.
        </p>
        <div className="mt-4 grid gap-px border border-line bg-line md:grid-cols-2">
          {[JEV, LAYA].map((model) => (
            <Column key={model.id} model={model}>
              <ClaimLine claim={model.measured.intro} className="text-micro text-ink-soft" />
              <Notes notes={model.measured.bullets} className="mt-3 text-micro leading-relaxed" />
              {model.measured.note && <Notes notes={model.measured.note} className="mt-4 text-micro leading-relaxed" />}
            </Column>
          ))}
        </div>
      </section>

      <Section title="Sources">
        <Sources items={sources} />
      </Section>
    </LearnPage>
  );
}

function Column({ model, children }: { model: Model; children: React.ReactNode }) {
  return (
    <div className="min-w-0 bg-surface">
      <h3 className="border-b border-line px-4 py-2.5 text-body font-extrabold">{model.name}</h3>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
