import type { Metadata } from "next";
import Link from "next/link";
import { Mermaid } from "@/components/mermaid";

export const metadata: Metadata = { title: "Learn | Decision Arena" };

const JEV = `flowchart LR
  S["State: text or JSON"] --> M
  Q["Typed questions: choice, score, noul"] --> M
  M["Jev System One model<br/>architecture not published"] --> P["Parallel sampler:<br/>every answer in one query"]
  P --> A["Typed answers with<br/>calibrated probabilities"]`;

const LAYA = `flowchart LR
  S["State + typed questions"] --> R{"Router: detects<br/>script and language"}
  R -->|English| E1["ModernBERT-large encoder<br/>421M parameters"]
  R -->|100+ languages| E2["mmBERT-base encoder<br/>322M parameters"]
  E1 --> H["Decision head scores<br/>each option"]
  E2 --> H
  H --> T["Temperature calibration<br/>by question type"]
  T --> A["Typed answers with probabilities"]`;

const RLCD = `flowchart LR
  X["State + question"] --> P["Policy reports a<br/>probability distribution"]
  P --> N["Exploration: Gaussian<br/>noise on the logits"]
  N --> R["Reward: strictly proper<br/>scoring rule"]
  R --> U["REINFORCE update with<br/>group-mean baseline"]
  U --> P`;

const ARENA = `flowchart LR
  G["Game state"] --> D["Described in words<br/>car close ahead, 12 m"]
  D --> M["Model picks one move<br/>with probabilities"]
  M --> G
  M --> E["Event stream: replay,<br/>live view, benchmark"]`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="text-3xl font-extrabold tracking-tight">{title}</h2>
      <div className="mt-4 grid max-w-[70ch] gap-4 text-lg leading-relaxed">{children}</div>
    </section>
  );
}

const ROWS: [string, string, string][] = [
  ["Made by", "TypeSafe AI, founded by Diogo Almeida (previously OpenAI)", "Convai Innovations"],
  ["Access", "Paid API (directly, or through Vercel AI Gateway)", "Download and run it yourself"],
  ["Weights", "Closed", "Open, Apache 2.0"],
  ["Architecture", "Transformer-based, not an LLM; details unpublished", "Encoder (ModernBERT-large or mmBERT-base) with a decision head"],
  ["Size", "Not published", "421M (English) or 322M (multilingual) parameters"],
  ["Input limit", "About 64,000 tokens per request, 32,000 for the state", "512 tokens (English), 1,024 (multilingual)"],
  ["Options per choice", "Up to 255", "Works best under about 20; options share a 192 to 256 token budget"],
  ["Training", "RLCD (Reinforcement Learning for Calibrated Decisions)", "RLCD, as described by Laya's authors (below)"],
  ["Stated speed", "70 to 500 ms per request", "About 33 ms per question on a T4 GPU"],
  ["Price", "$0.042 per million input tokens, output free", "Free; you pay for the hardware"],
];

export default function Page() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-20 pt-8 md:px-8">
      <h1 className="text-4xl font-extrabold leading-none tracking-tight md:text-5xl">How Jev and Laya work</h1>
      <p className="mt-3 max-w-[64ch] text-lg leading-relaxed text-ink-soft">
        Both are decision models. They never write text: they read a situation and put a probability on each option you give them.
      </p>

      <Section title="A different kind of model">
        <p>
          A language model answers by generating text one token at a time. If you want a decision from it, you parse that text and hope it matches one of your options.
        </p>
        <p>
          A decision model, which TypeSafe calls a System One model after the fast, intuitive thinking in Daniel Kahneman&apos;s <i>Thinking, Fast and Slow</i>, takes a state and typed questions and returns an answer for each question, with probabilities, in one pass. There are three question types: a <b>choice</b> between named options, a <b>score</b> on a scale you describe, and a <b>noul</b>, a yes or no probability. An answer can never fall outside the options, so there is nothing to parse and no type errors. Answers can still be wrong.
        </p>
        <p>Because the probabilities are meant to be calibrated, code can act on confident answers and send uncertain ones to a person or a bigger model.</p>
      </Section>

      <Section title="Jev">
        <p>
          TypeSafe released Jev on September 15, 2026. It is transformer-based but not a language model. TypeSafe describes a new architecture, a parallel sampler that produces every answer in a single query, and a training method called RLCD. It has not published the architecture itself, the model size, or the training data, so the middle box below is a black box on purpose.
        </p>
      </Section>
      <Mermaid chart={JEV} label="Jev: state and typed questions go into an unpublished model; a parallel sampler returns typed answers with calibrated probabilities." />

      <Section title="Laya">
        <p>
          Laya is an open-source answer to Jev from Convai Innovations. It takes the same state and typed questions and returns the same answer shapes. A router looks at the text&apos;s script and language (in under a millisecond, according to its authors) and picks a checkpoint: a ModernBERT-large encoder for English, or an mmBERT-base encoder for over 100 languages. A decision head on top of the encoder scores each option, and a per-question-type temperature calibrates the probabilities.
        </p>
        <p>
          One limit comes from that design: the options share a fixed token budget (192 tokens on the English checkpoint), so with many options each one gets only a few tokens. Laya&apos;s authors report it doing much worse than Jev once a choice has more than about 20 options.
        </p>
      </Section>
      <Mermaid chart={LAYA} label="Laya: a router picks an English or multilingual encoder; a decision head scores options; temperature calibration produces the probabilities." />

      <Section title="How both are trained: RLCD">
        <p>
          Reinforcement Learning for Calibrated Decisions rewards honest probabilities rather than answers people like. Laya&apos;s authors describe their version: the model reports a probability distribution, exploration adds random noise to its outputs, and the reward is a strictly proper scoring rule (log and spherical scores, plus the ranked probability score for ordered scales). Under such a rule the only way to maximize expected reward is to report the probabilities you actually believe. Updates use REINFORCE with a group-mean baseline, the same idea as GRPO.
        </p>
        <p>TypeSafe uses the same name for Jev&apos;s training but has not published its details.</p>
      </Section>
      <Mermaid chart={RLCD} label="RLCD loop: the policy reports a distribution, noise is added for exploration, a proper scoring rule gives the reward, and a REINFORCE update improves the policy." />

      <section className="mt-14">
        <h2 className="text-3xl font-extrabold tracking-tight">Side by side</h2>
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
              {ROWS.map(([k, jev, laya]) => (
                <tr key={k} className="border-b border-line align-top">
                  <th scope="row" className="py-3 pr-4 font-semibold text-ink-soft">{k}</th>
                  <td className="py-3 pr-4">{jev}</td>
                  <td className="py-3">{laya}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-[70ch] text-ink-soft">
          Laya&apos;s README also compares accuracy and calibration against Jev and reports Laya ahead on most classification sets and Jev ahead on large option sets. Those are the Laya team&apos;s numbers, with Jev figures taken from third parties, so treat them as claims. The arena&apos;s <Link href="/results/" className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">Results</Link> are our own measurements.
        </p>
      </section>

      <Section title="How the arena tests them">
        <p>
          Neither model sees pixels or coordinates. Before every move, the game is described in words: &ldquo;car close ahead (12 m), 4 m/s slower than you&rdquo;, &ldquo;BLOCKED: wall right next to you&rdquo;, &ldquo;your hand: 16, hard&rdquo;. Both models get exactly the same text and the same options, and pick one move. Distances and speeds are put into buckets because decision models are poor at arithmetic.
        </p>
        <p>
          Each game tests something different: Highway tests safety under time pressure, Snake tests spatial planning, and Blackjack tests risk, scored against basic strategy, the known best play. Simple baselines, such as always keeping the lane or a greedy snake, show what no intelligence scores.
        </p>
      </Section>
      <Mermaid chart={ARENA} label="Arena loop: the game state is described in words, a model picks one move with probabilities, the game advances, and every step is recorded." />

      <Section title="Sources">
        <ul className="list-disc pl-6">
          <li><a className="underline decoration-accent decoration-2 underline-offset-4" href="https://typesafe.ai/blog/introducing-system-one-models-and-jev">TypeSafe: Introducing System One Models and Jev</a></li>
          <li><a className="underline decoration-accent decoration-2 underline-offset-4" href="https://github.com/NandhaKishorM/laya">Laya on GitHub</a> and <a className="underline decoration-accent decoration-2 underline-offset-4" href="https://huggingface.co/convaiinnovations/laya">on Hugging Face</a></li>
          <li><a className="underline decoration-accent decoration-2 underline-offset-4" href="https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/">TechCrunch on Jev</a></li>
          <li><a className="underline decoration-accent decoration-2 underline-offset-4" href="https://flaviocopes.com/jev/">Flavio Copes: a deep dive into Jev</a> (limits and question types)</li>
        </ul>
      </Section>
    </main>
  );
}
