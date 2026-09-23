import type { Metadata } from "next";
import Link from "next/link";
import { LearnPage, Section, Source } from "@/components/learn-page";

export const metadata: Metadata = { title: "Jev and Laya side by side | Decision Arena" };

const ROWS: [string, string, string][] = [
  ["Made by", "TypeSafe AI, founded by Diogo Almeida (previously OpenAI)", "Convai Innovations"],
  ["Released", "15 September 2026", "Days later, as an open answer to Jev"],
  ["Access", "Paid API, directly or through Vercel AI Gateway", "Download the weights and run them"],
  ["Weights", "Closed", "Open, Apache 2.0"],
  ["Architecture", "Transformer-based, not an LLM; details unpublished", "Encoder (ModernBERT-large or mmBERT-base) with a decision head"],
  ["Size", "Not published", "421M (English) or 322M (multilingual)"],
  ["Input limit", "About 64,000 tokens, 32,000 for the state", "512 tokens (English), 1,024 (multilingual)"],
  ["Options per choice", "Up to 255", "Best under about 20; options share a 192 to 256 token budget"],
  ["Training", "RLCD, details unpublished", "RLCD, described in detail by its authors"],
  ["Stated speed", "70 to 500 ms per request", "About 33 ms per question on a T4 GPU"],
  ["Price", "$0.042 per million input tokens, output free", "Free; you pay for the hardware"],
  ["Runs offline", "No", "Yes"],
];

export default function Page() {
  return (
    <LearnPage
      title="Side by side"
      intro="Same interface, opposite trade-offs: one is rented and closed, the other is owned and open."
      checked="22 September 2026"
    >
      <section className="mt-12">
        <h2 className="text-3xl font-extrabold tracking-tight">The specifications</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-line text-sm text-ink-soft">
                <th className="py-2 pr-4 font-semibold" />
                <th className="py-2 pr-4 text-base font-extrabold text-ink">Jev</th>
                <th className="py-2 text-base font-extrabold text-ink">Laya</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, jev, laya]) => (
                <tr key={label} className="border-b border-line align-top">
                  <th scope="row" className="py-3 pr-4 font-semibold text-ink-soft">{label}</th>
                  <td className="py-3 pr-4">{jev}</td>
                  <td className="py-3">{laya}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Section title="Claims, and who is making them">
        <p>
          Laya&apos;s README compares the two directly and reports Laya ahead on most classification sets, three times better
          calibrated after temperature fitting, and roughly eight times faster, with Jev ahead on choices with many options.
          Those are the Laya team&apos;s numbers, and their Jev figures come from third parties rather than their own API access.
          Treat them as claims, not measurements.
        </p>
        <p>
          TypeSafe&apos;s claims are similar in kind: two orders of magnitude faster and cheaper than language models on the
          tasks they chose, with the evaluation designed in-house.
        </p>
        <p>
          That is why this site measures its own. Same games, same seeds, same text to both models, everything recorded.
        </p>
      </Section>

      <Section title="What we found">
        <p>
          Jev wins every metric about making good decisions: crash rate, distance, food eaten, matching blackjack&apos;s optimal
          play, whether the answer follows the situation, and whether its confidence can be trusted. Laya wins every metric
          about running it: speed, no failures, no rate limits, no cost, and full control.
        </p>
        <p>
          The short version: <b>Jev can decide, but you rent it. Laya you own, but on these games it is not deciding.</b>{" "}
          The per-metric table is on the{" "}
          <Link href="/scorecard/" prefetch={false} className="font-semibold underline decoration-accent decoration-2 underline-offset-4">Scorecard</Link>, with the raw numbers on{" "}
          <Link href="/results/" prefetch={false} className="font-semibold underline decoration-accent decoration-2 underline-offset-4">Results</Link>.
        </p>
      </Section>

      <Section title="Which to reach for">
        <p>
          <b>Jev</b> when the decision matters more than the bill: safety checks, routing, anything where a wrong choice is
          expensive, and when a choice has dozens of options.
        </p>
        <p>
          <b>Laya</b> when the data cannot leave your machine, when you need thousands of decisions a second, when there is
          no budget, or when you intend to fine-tune the model on your own decisions, which is the one thing a closed model
          cannot offer.
        </p>
        <p className="text-ink-soft">
          Sources: <Source href="https://typesafe.ai/blog/introducing-system-one-models-and-jev">TypeSafe&apos;s launch post</Source>,{" "}
          <Source href="https://github.com/NandhaKishorM/laya">Laya&apos;s README and benchmarks</Source>.
        </p>
      </Section>
    </LearnPage>
  );
}
