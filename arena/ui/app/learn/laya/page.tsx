import type { Metadata } from "next";
import Link from "next/link";
import { Facts, LearnPage, Section, Source } from "@/components/learn-page";
import { Mermaid } from "@/components/mermaid";
import { RealDecision } from "@/components/real-decision";

export const metadata: Metadata = { title: "Laya | Decision Arena" };

const LAYA = `flowchart LR
  S["State + typed questions"] --> R{"Router: detects<br/>script and language"}
  R -->|English| E1["ModernBERT-large encoder<br/>421M parameters"]
  R -->|100+ languages| E2["mmBERT-base encoder<br/>322M parameters"]
  E1 --> H["Decision head<br/>scores each option"]
  E2 --> H
  H --> T["Temperature calibration<br/>by question type"]
  T --> A["Typed answers with probabilities"]`;

const RLCD = `flowchart LR
  X["State + question"] --> P["Policy reports a<br/>probability distribution"]
  P --> N["Exploration: noise<br/>on the outputs"]
  N --> R["Reward: strictly proper<br/>scoring rule"]
  R --> U["REINFORCE update with<br/>group-mean baseline"]
  U --> P`;

export default function Page() {
  return (
    <LearnPage
      title="Laya"
      intro="Convai Innovations' open-source answer to Jev: the same interface, weights you can download, and it runs on your own machine."
      checked="22 September 2026"
    >
      <Section title="How it is built">
        <p>
          Laya takes the same state and typed questions and returns the same answer shapes. A router reads the script and
          language of the text, in under a millisecond according to its authors, and picks a checkpoint: a ModernBERT-large
          encoder for English, or an mmBERT-base encoder for over 100 languages. A decision head on top of the encoder scores
          each option, and a temperature per question type calibrates the probabilities.
        </p>
      </Section>
      <Mermaid chart={LAYA} label="Laya: a router picks an English or multilingual encoder, a decision head scores the options, temperature calibration produces the probabilities." />

      <Section title="Three checkpoints">
        <Facts rows={[
          ["laya", "ModernBERT-large, 421M parameters, 512-token context. English."],
          ["laya-multilingual", "mmBERT-base, 322M parameters, 1,024-token context. Over 100 languages, and about twice as fast."],
          ["laya-typed-decisions", "ModernBERT-large, 421M, 1,024-token context, aimed at typed-decision workflows."],
        ]} />
        <p>
          A design limit follows from the decision head: the options share a fixed token budget, 192 tokens on the English
          checkpoint. With many options, each gets only a few tokens and they blur together, which is why Laya&apos;s own authors
          report it falling behind Jev once a choice has more than about 20 options.
        </p>
      </Section>

      <Section title="Trained to be honest: RLCD">
        <p>
          Reinforcement Learning for Calibrated Decisions rewards honest probabilities instead of answers people like. Laya&apos;s
          authors describe their version: the model reports a distribution, exploration adds noise, and the reward is a
          strictly proper scoring rule. Under such a rule, the only way to maximise expected reward is to report the
          probabilities you actually believe. Updates use REINFORCE with a group-mean baseline, the same idea as GRPO.
          TypeSafe uses the same name for Jev&apos;s training without publishing the details.
        </p>
      </Section>
      <Mermaid chart={RLCD} label="RLCD: the policy reports a distribution, noise drives exploration, a proper scoring rule gives the reward, and a REINFORCE update improves the policy." />

      <Section title="Running it yourself">
        <Facts rows={[
          ["Install", <><code>pip install laya</code>. The weights (2.3 GB) download from Hugging Face on first use.</>],
          ["Hardware", "A GPU is the point: its authors report about 33 ms per question on a T4. On a laptop CPU we saw 107 to 590 ms."],
          ["Price", "Free, Apache 2.0. You pay for the hardware, and nothing leaves your machine."],
          ["Answers", "Same shapes as Jev: choice, score and noul, with probabilities and a confidence."],
        ]} />
      </Section>

      <Section title="What a call looks like">
        <p>A real decision from a blackjack game on this site, unedited.</p>
      </Section>
      <RealDecision game="blackjack" agent="laya" seed={0} step={3} />

      <Section title="What we measured">
        <p>
          On these games Laya did not read the situation. In blackjack it chose stick on all 200 decisions, scoring exactly
          like the always-stick baseline; on the highway, 64% of its decisions were lane changes into a lane that did not
          exist. Its probability of hitting on 8 (which cannot bust) was within a few points of hitting on 21 (which always
          busts). Its confidence also runs backwards: when it claimed 80 to 90%, it was right about half the time.
        </p>
        <p>
          That is a fair result for these games and an unfair one for the model: Laya was trained on support tickets,
          moderation and similar work, not games, and we ran it on a laptop CPU. Its weights are open, so the obvious next
          experiment is to fine-tune it on decisions like these and put it back in the arena. Numbers on the{" "}
          <Link href="/results/" prefetch={false} className="font-semibold underline decoration-accent decoration-2 underline-offset-4">Results</Link> page.
        </p>
        <p className="text-ink-soft">
          Sources: <Source href="https://github.com/NandhaKishorM/laya">Laya on GitHub</Source>,{" "}
          <Source href="https://huggingface.co/convaiinnovations/laya">the weights on Hugging Face</Source>.
        </p>
      </Section>
    </LearnPage>
  );
}
