import type { Metadata } from "next";
import Link from "next/link";
import { Code } from "@/components/code";
import { LearnPage, Mono, Section } from "@/components/learn-page";
import { Mermaid } from "@/components/mermaid";
import { RealDecision } from "@/components/real-decision";
import { Wire } from "@/components/wire";

export const metadata: Metadata = { title: "How a decision model works | Decision Arena" };

// Highway, seed 4, decision 1: the one call this whole page walks through.
const CALL = { game: "highway", agent: "jev", seed: 4, index: 0 } as const;

const FLOW = `flowchart LR
  W[the real world] --> D[you describe it in words]
  D --> S[state]
  O[the answers you accept] --> Q[questions: type, instructions, criteria]
  S --> R[one request]
  Q --> R
  R --> M[decision model]
  M --> P[a probability for every option]
  P --> A[your code acts, asks a human, or falls back]`;

// From Laya's own documentation: this arena only ever asks choice questions.
const TYPES = {
  department: {
    type: "choice",
    instructions: "Which department should handle this request?",
    criteria: { billing: "invoices, payments, refunds", technical: "bugs, outages, system errors" },
  },
  urgency: {
    type: "score",
    instructions: "How urgent is this request?",
    criteria: ["not urgent", "soon", "critical deadline or blocking issue"],
  },
  refund_requested: { type: "noul", instructions: "Does the user explicitly request a refund?" },
};

const link = "font-semibold underline decoration-accent decoration-2 underline-offset-4";

export default function Page() {
  return (
    <LearnPage
      title="How a decision model works"
      intro="You send the situation and the answers you will accept. It sends back how likely each answer is."
      checked="23 September 2026"
    >
      <Section title="The whole idea in two sentences">
        <p>You send the model the situation, and the list of answers you are willing to accept.</p>
        <p>
          It sends back how likely each of those answers is. It never writes a sentence, and it can never answer with
          something that was not on your list.
        </p>
      </Section>

      <Section title="First, one word that confuses everyone">
        <p>
          The API calls your input the <b>state</b>. That word means <i>the situation</i>: what is happening right now.
          It does not mean the answers.
        </p>
        <p>So there are two different lists in every call, and it helps to name them apart:</p>
        <div className="min-w-0 overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[440px] border-collapse text-left text-micro">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-3 py-2 font-extrabold" />
                <th scope="col" className="px-3 py-2 font-extrabold">What it is</th>
                <th scope="col" className="px-3 py-2 font-extrabold">Who writes it</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line align-top">
                <th scope="row" className="px-3 py-2 text-left font-mono font-semibold">state</th>
                <td className="px-3 py-2 text-ink-soft">The situation, in words</td>
                <td className="px-3 py-2 text-ink-soft">You, fresh on every call</td>
              </tr>
              <tr className="align-top">
                <th scope="row" className="px-3 py-2 text-left font-mono font-semibold">options</th>
                <td className="px-3 py-2 text-ink-soft">The answers the model may pick from</td>
                <td className="px-3 py-2 text-ink-soft">You, usually the same every call</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Walk through one real decision">
        <p className="text-ink-soft">
          Every block below is read straight out of one recorded game: highway, seed 4, decision 1. Nothing here is typed
          out by hand.
        </p>
      </Section>

      <Step n={1} title="The state: describe the situation in words">
        <p>
          This is a car driving on a four lane highway. Before asking anything, you write down what is happening, as
          plain phrases:
        </p>
        <Wire {...CALL} part="state" />
        <p>Three things worth noticing.</p>
        <p>
          The keys are yours. <Mono>your_lane</Mono> and{" "}
          <Mono>left_lane</Mono> are names this project
          invented. The model was never trained on them. You can call them anything, in any structure, as long as a
          person could read it and understand the situation.
        </p>
        <p>
          There are no pixels and no raw coordinates. The simulator knows the car is at x=179.63, y=8.0. The model is
          told &ldquo;lane 3 of 4&rdquo; and &ldquo;car close ahead (20 m)&rdquo; instead. Turning the raw world into
          short phrases is your job, and it is the part you control most.
        </p>
        <p>
          This is the only part that changes between decisions. One second later,{" "}
          <Mono>left_lane</Mono> reads &ldquo;car ahead (36
          m), 6 m/s slower than you&rdquo;.
        </p>
      </Step>

      <Step n={2} title="The question: say what you want decided">
        <p>A question has a name, a type, and an instruction:</p>
        <Wire {...CALL} part="question" />
        <p>
          <Mono>action</Mono> is the name you will read the
          answer back by. <Mono>choice</Mono> is the type,
          which decides what shape the answer comes back in. The instruction is what you would tell a person who had to
          make this call for you.
        </p>
      </Step>

      <Step n={3} title="The criteria: list the answers you will accept">
        <p>
          For a <Mono>choice</Mono> question, the criteria are
          the options, each with a short description of what it means:
        </p>
        <Wire {...CALL} part="criteria" />
        <p>
          This is the part that makes a decision model different from a chatbot. The answer is guaranteed to be one of
          these five keys. Not a sentence containing one of them. Not a near miss like{" "}
          <Mono>LEFT</Mono> or{" "}
          <Mono>turn left</Mono>. One of these five, every
          time.
        </p>
        <p>
          The options live in the request, not in the model. Nobody trained it on highway driving. You can swap in a
          completely different set of options on the next call and it will work the same way.
        </p>
      </Step>

      <Step n={4} title="What comes back">
        <Wire {...CALL} part="answer" mark="IDLE" />
        <p>
          Read it as a sentence: <i>it wants to keep its lane, it is half considering moving left, and it has
          essentially ruled out moving right.</i>
        </p>
        <p>
          That last part is the interesting one.{" "}
          <Mono>LANE_RIGHT</Mono> is at 0.01 because the state
          said there is a car close ahead on the right, 20 metres away. The numbers are not decoration. They are what the
          model read.
        </p>
      </Step>

      <Step n={5} title="What your code does with it">
        <p>The simplest thing is to take the highest and act on it. But the numbers let you do better:</p>
        <ul className="grid gap-3">
          <li className="border-l-2 border-line pl-4">Act on it when the top option is above a threshold you choose.</li>
          <li className="border-l-2 border-line pl-4">Ask a human when nothing clears the bar, which is the useful case a chatbot cannot give you.</li>
          <li className="border-l-2 border-line pl-4">
            Fall back to a safe default when the call fails or takes too long. In this project the fallback is IDLE: keep
            the lane, keep the speed.
          </li>
        </ul>
      </Step>

      <Section title="The whole call, in one place">
        <p>
          The same decision, unedited, both halves together. The whole game is replayable in the{" "}
          <Link href="/" prefetch={false} className={link}>Arena</Link>.
        </p>
      </Section>
      <RealDecision game="highway" agent="jev" seed={4} step={0} />
      <p className="mt-2 max-w-[70ch] text-body leading-relaxed">
        That is the entire interface. Everything else on this site is that call, repeated.
      </p>

      <Section title="The diagram">
        <p className="text-ink-soft">One request in, one probability per option out.</p>
      </Section>
      <Mermaid chart={FLOW} label="The real world is described in words to make the state; the answers you accept become the questions; both go in one request to the decision model, which returns a probability for every option, and your code acts, asks a human, or falls back." />

      <Section title="Three types of question">
        <p>
          These are not three questions. They are three shapes a question can take, and each one changes what you send
          and what you get back.
        </p>
        <div className="min-w-0 overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[620px] border-collapse text-left text-micro">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-3 py-2 font-extrabold">Type</th>
                <th scope="col" className="px-3 py-2 font-extrabold">Use it for</th>
                <th scope="col" className="px-3 py-2 font-extrabold">criteria you send</th>
                <th scope="col" className="px-3 py-2 font-extrabold">What comes back</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["choice", "Pick one of N", "A map of option to description", "The chosen key, plus a probability for every option"],
                ["score", "How much, on a scale", "An ordered list of rungs, low to high", "A number on that scale, for example 1.84 out of 2"],
                ["noul / boolean", "Is this true, yes or no", "Nothing. You send no criteria", "A single probability, for example 0.892"],
              ].map(([type, use, send, back]) => (
                <tr key={type} className="border-b border-line last:border-0 align-top">
                  <th scope="row" className="px-3 py-2 text-left font-mono font-semibold">{type}</th>
                  <td className="px-3 py-2 text-ink-soft">{use}</td>
                  <td className="px-3 py-2 text-ink-soft">{send}</td>
                  <td className="px-3 py-2 text-ink-soft">{back}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="max-w-[70ch] text-ink-soft">
          The names are not standard. The yes-or-no question is <code className="font-mono text-ink">noul</code> to Laya, which
          answers in a field of the same name, and <code className="font-mono text-ink">boolean</code> to Jev, which answers in
          a field called <code className="font-mono text-ink">probability</code>. Send Laya&apos;s name to Jev and you get back{" "}
          <code className="font-mono text-ink">400 Invalid discriminator value. Expected &apos;choice&apos; | &apos;score&apos; | &apos;boolean&apos;</code>.
          The question is the same; only the dialect differs.
          <span className="ml-2 rounded-sm border border-line bg-sunk px-1.5 py-px align-middle font-mono text-micro font-normal text-ink-soft">measured here</span>
        </p>
        <figure className="grid min-w-0 gap-2">
          <figcaption className="text-micro font-semibold text-ink-soft">
            A real example of each, from Laya&apos;s own documentation
            <span className="ml-2 rounded-sm border border-line bg-sunk px-1.5 py-px align-middle font-mono text-micro font-normal text-ink-soft">model card</span>
          </figcaption>
          <div className="min-w-0 border border-line bg-surface"><Code value={TYPES} className="" /></div>
        </figure>
        <p>All three can go in a single call, and they are answered together.</p>
      </Section>

      <Section title="Why probabilities instead of a sentence">
        <p>
          Asking a language model the same thing gets you text you then have to parse, and text can say anything. Here:
        </p>
        <ul className="grid gap-3">
          <li className="border-l-2 border-line pl-4">
            <b>It cannot answer off the list.</b> No parsing, no retries, no regex that breaks when the wording changes.
          </li>
          <li className="border-l-2 border-line pl-4">
            <b>You get the runner up.</b> &ldquo;IDLE 0.58, LANE_LEFT 0.31&rdquo; tells you it was a close call.
            &ldquo;IDLE&rdquo; alone does not.
          </li>
          <li className="border-l-2 border-line pl-4">
            <b>You can set a bar.</b> Act above 0.8, ask a person below it. That is a product decision you can only make
            if you have a number.
          </li>
          <li className="border-l-2 border-line pl-4">
            <b>It is fast and cheap.</b> No tokens are generated, so there is nothing to wait for. Laya answers in about
            33 ms on a GPU.
          </li>
        </ul>
      </Section>

      <Section title="The two models">
        <p>
          Everything above is the interface. The differences are in the models behind it, and both pages answer the same
          six questions in the same order.
        </p>
        <p>
          <Link href="/learn/jev/" prefetch={false} className={link}>Jev</Link>, the closed one you rent.{" "}
          <Link href="/learn/laya/" prefetch={false} className={link}>Laya</Link>, the open one you download.{" "}
          <Link href="/learn/comparison/" prefetch={false} className={link}>Side by side</Link>, the same answers in two
          columns.
        </p>
      </Section>
    </LearnPage>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10" aria-labelledby={`step-${n}`}>
      <div className="flex items-baseline gap-3">
        <span aria-hidden className="numeric text-h3 font-extrabold leading-none text-line-strong">{n}</span>
        <h3 id={`step-${n}`} className="max-w-[28ch] text-h3 font-extrabold tracking-tight">{title}</h3>
      </div>
      <div className="mt-4 grid max-w-[70ch] gap-4 text-body leading-relaxed">{children}</div>
    </section>
  );
}
