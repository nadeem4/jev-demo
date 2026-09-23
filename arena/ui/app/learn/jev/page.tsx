import type { Metadata } from "next";
import Link from "next/link";
import { Facts, LearnPage, Section, Source } from "@/components/learn-page";
import { Mermaid } from "@/components/mermaid";
import { RealDecision } from "@/components/real-decision";

export const metadata: Metadata = { title: "Jev | Decision Arena" };

const JEV = `flowchart LR
  S["State: text or JSON"] --> M
  Q["Typed questions:<br/>choice, score, noul"] --> M
  M["Jev<br/>architecture not published"] --> P["Parallel sampler:<br/>every answer in one query"]
  P --> A["Typed answers with<br/>calibrated probabilities"]`;

export default function Page() {
  return (
    <LearnPage
      title="Jev"
      intro="TypeSafe AI's closed decision model, released on 15 September 2026. Fast, typed, and a black box."
      checked="22 September 2026"
    >
      <Section title="What TypeSafe has published">
        <p>
          Jev is transformer-based but not a language model. TypeSafe describes a new architecture, a parallel sampler that
          produces every answer in one query rather than token by token, and a training method they call RLCD, Reinforcement
          Learning for Calibrated Decisions. The architecture itself, the model size and the training data are not published,
          so the middle of this diagram is a black box on purpose.
        </p>
      </Section>
      <Mermaid chart={JEV} label="Jev: a state and typed questions go into an unpublished model; a parallel sampler returns typed answers with calibrated probabilities." />

      <Section title="The facts you need to build with it">
        <Facts rows={[
          ["Access", "A paid API, directly from TypeSafe or through Vercel AI Gateway. Signups were paused shortly after launch."],
          ["Price", "$0.042 per million input tokens; output is free, because there is no generated text."],
          ["Speed", "TypeSafe states 70 to 500 ms per request. We measured about 305 ms through the Gateway, including the network."],
          ["Input limit", "About 64,000 tokens per request, of which 32,000 for the state."],
          ["Options", "Up to 255 per choice question, which is far more than Laya handles."],
          ["Answers", "A probability for every option, plus a confidence for choice and score questions. Never text."],
          ["Failure modes", "It cannot return an invalid option, but it can be wrong, rate-limit you (HTTP 429) or be overloaded (529)."],
        ]} />
      </Section>

      <Section title="What a call looks like">
        <p>
          A request is a state plus questions; the answer is probabilities. This is a real decision from a highway game,
          taken from the recordings.
        </p>
      </Section>
      <RealDecision game="highway" agent="jev" seed={1} step={4} />

      <Section title="What we measured">
        <p>
          Across three games with zero training, Jev never crashed on the highway, matched blackjack&apos;s optimal play 77% of
          the time, and its answers moved substantially between opposite situations, which is the sign that it is reading
          the state at all. It is also cautious: on the highway it kept its lane on 94% of decisions and drove near the
          minimum speed, and in Snake it circled rather than dying.
        </p>
        <p>
          The costs are operational: 1,231 rate-limit retries across our runs, 14 failed decisions, and a per-call latency
          dominated by the network. Full numbers on the{" "}
          <Link href="/results/" prefetch={false} className="font-semibold underline decoration-accent decoration-2 underline-offset-4">Results</Link>{" "}
          and{" "}
          <Link href="/scorecard/" prefetch={false} className="font-semibold underline decoration-accent decoration-2 underline-offset-4">Scorecard</Link>{" "}
          pages.
        </p>
        <p className="text-ink-soft">
          Sources: <Source href="https://typesafe.ai/blog/introducing-system-one-models-and-jev">TypeSafe&apos;s launch post</Source>,{" "}
          <Source href="https://flaviocopes.com/jev/">Flavio Copes on Jev&apos;s limits</Source>,{" "}
          <Source href="https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/">TechCrunch</Source>.
        </p>
      </Section>
    </LearnPage>
  );
}
