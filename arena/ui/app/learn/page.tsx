import type { Metadata } from "next";
import Link from "next/link";
import { Facts, LearnPage, Section, Source } from "@/components/learn-page";
import { Mermaid } from "@/components/mermaid";
import { RealDecision } from "@/components/real-decision";

export const metadata: Metadata = { title: "Decision models | Decision Arena" };

const LOOP = `flowchart LR
  G["Game state"] --> D["Described in words<br/>car close ahead, 12 m"]
  D --> M["Model puts a probability<br/>on every option"]
  M --> C["Code picks and acts"]
  C --> G`;

export default function Page() {
  return (
    <LearnPage
      title="What a decision model is"
      intro="Jev and Laya never write text. They read a situation and put a probability on each option you give them."
      checked="22 September 2026"
    >
      <Section title="Not a language model">
        <p>
          A language model answers by generating text, one token at a time. To get a decision out of it you parse that
          text and hope it matches one of your options. It might not, and any probability it quotes is itself generated text.
        </p>
        <p>
          A decision model takes a <b>state</b> (the situation, as text or JSON) and <b>typed questions</b>, and returns an
          answer per question in a single pass. TypeSafe calls this class a <i>System One model</i>, after the fast,
          intuitive thinking in Daniel Kahneman&apos;s <i>Thinking, Fast and Slow</i>. The answer can never fall outside the
          options you listed, so there is nothing to parse. It can still be the wrong option.
        </p>
      </Section>

      <Section title="Three kinds of question">
        <Facts rows={[
          ["choice", "Pick one of named options; returns a probability for each. Every game here uses one: a move, a lane, hit or stick."],
          ["score", "A position on a scale you describe, such as severity 0 to 3. Returns the expected level and the spread."],
          ["noul", "Is this true? Returns a single probability. Used for yes-or-no checks: is this spam, is this urgent, is this a jailbreak."],
        ]} />
        <p>
          Because every answer carries probabilities, code can act on the confident ones and send uncertain ones to a person
          or a larger model. That is the pitch: fast, cheap, typed decisions inside ordinary software.
        </p>
      </Section>

      <Section title="A real decision, start to finish">
        <p>
          One decision from a game on this site: what the model was sent, and exactly what it answered. Nothing is edited,
          and the whole game is replayable in the{" "}
          <Link href="/" prefetch={false} className="underline decoration-accent decoration-2 underline-offset-4">Arena</Link>.
        </p>
      </Section>
      <RealDecision game="highway" agent="jev" seed={0} step={6} />

      <Section title="How the arena uses them">
        <p>
          Neither model sees pixels or coordinates. Each game turns its state into short sentences, because decision models
          read meaning and are poor at arithmetic. Both models get exactly the same text and the same options.
        </p>
      </Section>
      <Mermaid chart={LOOP} label="The arena loop: game state described in words, the model puts probabilities on the options, code acts, the game moves on." />

      <Section title="Where to go next">
        <p>
          <Link href="/learn/jev/" prefetch={false} className="font-semibold underline decoration-accent decoration-2 underline-offset-4">Jev</Link>, the closed model that started this.{" "}
          <Link href="/learn/laya/" prefetch={false} className="font-semibold underline decoration-accent decoration-2 underline-offset-4">Laya</Link>, the open-source answer you can run yourself.{" "}
          <Link href="/learn/comparison/" prefetch={false} className="font-semibold underline decoration-accent decoration-2 underline-offset-4">Side by side</Link>, with what we measured.
        </p>
        <p className="text-ink-soft">
          Sources: <Source href="https://typesafe.ai/blog/introducing-system-one-models-and-jev">TypeSafe&apos;s launch post</Source>,{" "}
          <Source href="https://github.com/NandhaKishorM/laya">Laya on GitHub</Source>,{" "}
          <Source href="https://flaviocopes.com/jev/">a deep dive into Jev</Source>.
        </p>
      </Section>
    </LearnPage>
  );
}
