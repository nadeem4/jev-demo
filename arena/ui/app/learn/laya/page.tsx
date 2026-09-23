import type { Metadata } from "next";
import { LearnPage } from "@/components/learn-page";
import { Mermaid } from "@/components/mermaid";
import { ModelPage } from "@/components/model-page";
import { LAYA } from "@/lib/learn";

export const metadata: Metadata = { title: "Laya | Decision Arena" };

// The one diagram on the site that earns its place: the option-marker mechanism.
const MARKERS = `flowchart LR
    S[state, in words] --> IN
    O[your options] --> IN
    IN["one input: the state, plus a [MASK] marker per option"] --> F[one forward pass]
    F --> G1[score at marker 1]
    F --> G2[score at marker 2]
    F --> G3[score at marker N]
    G1 --> SM[softmax across the markers]
    G2 --> SM
    G3 --> SM
    SM --> P[a probability per option]`;

export default function Page() {
  return (
    <LearnPage title={LAYA.name} intro={LAYA.standfirst} checked="23 September 2026">
      <ModelPage
        model={LAYA}
        after={{
          options: (
            <Mermaid
              chart={MARKERS}
              label="The state and your options go in as one input, carrying a MASK marker per option. One forward pass scores every marker, and a softmax across the markers turns those scores into a probability per option."
            />
          ),
        }}
      />
    </LearnPage>
  );
}
