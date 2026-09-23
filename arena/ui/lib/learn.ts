// The six questions both model pages answer, and each model's answers to them.
//
// This module is the only place the answers are written. The Jev page renders JEV,
// the Laya page renders LAYA, and the comparison page renders both side by side, so
// the three pages cannot drift apart.

/** Where a claim came from. A closed set, so a typo cannot invent a category. */
export type Provenance = "source" | "model-card" | "config" | "measured" | "inference";

const PROVENANCE_LABEL: Record<Provenance, string> = {
  source: "source",
  "model-card": "model card",
  config: "config.json",
  measured: "measured here",
  inference: "our inference",
};

export interface Claim {
  /** The sentence itself. Backticked spans are set in monospace; see splitCode. */
  text: string;
  /** Omitted when the sentence carries no factual claim of its own. */
  from?: Provenance;
  /** What an inference rests on, e.g. "from the absence of a published method". */
  because?: string;
}

/** The label shown beside a claim, or null when the sentence claims nothing. */
export function provenanceLabel(claim: Claim): string | null {
  if (!claim.from) return null;
  const label = PROVENANCE_LABEL[claim.from];
  return claim.because ? `${label}, ${claim.because}` : label;
}

export interface Piece { text: string; code: boolean }

/** Splits a claim into plain and `backticked` pieces, keeping every character. */
export function splitCode(text: string): Piece[] {
  const pieces: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    if (m.index! > last) pieces.push({ text: text.slice(last, m.index!), code: false });
    pieces.push({ text: m[1], code: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last), code: false });
  return pieces;
}

export const QUESTIONS = [
  { id: "kind", title: "What kind of model is it" },
  { id: "state", title: "How it reads the state" },
  { id: "options", title: "How it turns options into numbers" },
  { id: "calibration", title: "How it was trained to be calibrated" },
  { id: "cost", title: "What it costs to run" },
  { id: "limits", title: "What it cannot do" },
] as const;

export type Question = (typeof QUESTIONS)[number];
export type QuestionId = Question["id"];
export type ModelId = "jev" | "laya";

/** A bullet, or a paragraph that opens with a bolded lead. */
export interface Note { lead?: string; claims: Claim[] }
export interface Row { label: string; claim: Claim }
export interface Table { head: string[]; rows: string[][]; from?: Provenance }

export interface Answer {
  /** False when the model's makers have published no answer to this question. */
  published: boolean;
  /** The short answer, when there is one. */
  headline?: Claim;
  body?: Claim[];
  rows?: Row[];
  table?: Table;
  bullets?: Note[];
}

export interface Model {
  id: ModelId;
  name: string;
  standfirst: string;
  preface: Note[];
  answers: Record<QuestionId, Answer>;
  measured: { intro: Claim; bullets: Note[]; note?: Note[] };
  sources: { text: string; href: string }[];
}

export interface PairedAnswer {
  question: Question;
  jev: Answer;
  laya: Answer;
  /** The model with no published answer, when exactly one is silent. */
  unpublished: ModelId | null;
}

/** The two models' answers, question by question, for the side-by-side page. */
export function pairAnswers(jev: Model, laya: Model): PairedAnswer[] {
  return QUESTIONS.map((question) => {
    const a = jev.answers[question.id];
    const b = laya.answers[question.id];
    const unpublished = a.published === b.published ? null : a.published ? laya.id : jev.id;
    return { question, jev: a, laya: b, unpublished };
  });
}

const RUNS: Claim = { text: "Everything marked measured here comes from the runs in this repo, listed on the Results page." };

export const JEV: Model = {
  id: "jev",
  name: "Jev",
  standfirst: "TypeSafe AI's closed decision model, released 15 September 2026.",
  preface: [{
    lead: "What follows is mostly an inventory of what is not known.",
    claims: [{ text: "That is not an editorial choice. TypeSafe has published a launch post, a docs site and a price, and almost nothing about the model itself." }],
  }],
  answers: {
    kind: {
      published: false,
      headline: { text: "Unknown.", from: "source" },
      body: [
        { text: "TypeSafe's launch post says they built “a new model architecture, parallel sampler for maximum efficiency, and training method we call Reinforcement Learning for Calibrated Decisions (RLCD)”. That is the whole of it. The words transformer, attention, encoder, decoder and parameters appear nowhere in the post or the docs.", from: "source" },
        { text: "TechCrunch describes Jev as “a new transformer-based model… that is not a large language model”. That is a reporter's wording, not TypeSafe's, and it is the only architecture claim in print anywhere.", from: "source" },
        { text: "So: it is not a language model, it does not generate text, and beyond that nobody outside TypeSafe has said what it is." },
      ],
    },
    state: {
      published: true,
      headline: { text: "About 64,000 tokens per request, of which 32,000 may be the state.", from: "source" },
      body: [{ text: "How it represents them is not published.", from: "source" }],
    },
    options: {
      published: false,
      headline: { text: "Not published.", from: "source" },
      body: [
        { text: "TypeSafe describes a “parallel sampler” that produces every answer in one query rather than token by token, which tells you the shape of the computation and nothing about the mechanism. Up to 255 options per choice question are supported.", from: "source" },
        { text: "Compare the Laya page, which answers this question in two sentences, because the weights are downloadable." },
      ],
    },
    calibration: {
      published: false,
      headline: { text: "RLCD, Reinforcement Learning for Calibrated Decisions.", from: "source" },
      body: [
        { text: "The name is published. The method is not: no reward function, no data, no procedure. Laya's authors use the same name for their own training and do publish the details, so the Laya page can describe a concrete algorithm where this page can only report a name." },
      ],
    },
    cost: {
      published: true,
      rows: [
        { label: "Access", claim: { text: "A paid API, from TypeSafe directly or through Vercel AI Gateway. Signups were paused shortly after launch.", from: "source" } },
        { label: "Price", claim: { text: "$0.042 per million input tokens. Output is free, because there is no generated text.", from: "source" } },
        { label: "Speed, stated", claim: { text: "70 to 500 ms per request", from: "source" } },
        { label: "Speed, measured", claim: { text: "p50 of about 305 ms through the Gateway, network included", from: "measured" } },
        { label: "Hardware", claim: { text: "None of yours. It runs on TypeSafe's." } },
      ],
    },
    limits: {
      published: true,
      bullets: [
        { lead: "Run on your machine.", claims: [{ text: "No weights, no local option, and your state leaves your network on every call." }] },
        { lead: "Be fine-tuned.", claims: [{ text: "Whatever it knows is what you get.", from: "inference", because: "from there being no published training path" }] },
        { lead: "Be inspected.", claims: [{ text: "You cannot check any claim about it against anything." }] },
        { lead: "Be relied on for throughput.", claims: [
          { text: "We hit 1,231 rate-limit retries (HTTP 429) and 14 outright failed decisions across our runs.", from: "measured" },
          { text: "It can also return 529 when overloaded.", from: "source" },
        ] },
        { lead: "Return an invalid option.", claims: [{ text: "Worth stating as a genuine strength: it cannot answer off the list. It can still be wrong." }] },
      ],
    },
  },
  measured: {
    intro: { text: "Three games, zero training, 10 episodes each.", from: "measured" },
    bullets: [
      { lead: "Highway:", claims: [{ text: "survived all 40 seconds, every episode. No crashes.", from: "measured" }] },
      { lead: "Blackjack:", claims: [{ text: "matched basic strategy on 77% of decisions (95% CI 73 to 81).", from: "measured" }] },
      { lead: "Snake:", claims: [{ text: "ate 1.8 food per episode, against 17.3 for a 15-line greedy script.", from: "measured" }] },
      { lead: "Reading the situation:", claims: [{ text: "its answers moved substantially between opposite situations, which is the test for whether it is reading the state at all rather than answering from habit.", from: "measured" }] },
      { lead: "Caution:", claims: [{ text: "it kept its lane on 94% of highway decisions and drove near the minimum allowed speed. In Snake it circled rather than dying.", from: "measured" }] },
    ],
    note: [{ claims: [{ text: "So: it does not crash, it does not do anything stupid, and it does not win. Safe and unambitious is a real decision-making style, and on a highway it is the right one." }] }],
  },
  sources: [
    { text: "TypeSafe's launch post, 15 September 2026", href: "https://typesafe.ai/blog/introducing-system-one-models-and-jev" },
    { text: "docs.typesafe.ai", href: "http://docs.typesafe.ai" },
    { text: "TechCrunch, 18 September 2026", href: "https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/" },
    { text: "Flavio Copes on Jev's limits", href: "https://flaviocopes.com/jev/" },
    { text: RUNS.text, href: "/results/" },
  ],
};

export const LAYA: Model = {
  id: "laya",
  name: "Laya",
  standfirst: "Convai Innovations' open-weights decision model. Apache 2.0, downloadable, runs on your own machine.",
  preface: [{
    lead: "The difference from the Jev page is not opinion, it is availability.",
    claims: [{ text: "Every claim below can be checked against a file you can download. Where the Jev page says not published, this page cites a line in a config." }],
  }],
  answers: {
    kind: {
      published: true,
      headline: { text: "An encoder.", from: "config" },
      body: [
        { text: "A BERT-family transformer that reads the whole input in both directions at once and produces no text at all. `config.json` says `ModernBertForMaskedLM`: hidden size 1024, 28 layers alternating full and sliding attention, mean pooling.", from: "config" },
        { text: "That is the sharpest contrast with a chat model. GPT-style models are decoders: they predict the next token, then the next, building a sentence. An encoder does not predict the next anything. It reads, and it scores. One forward pass, about 33 ms, no tokens produced.", from: "model-card" },
        { text: "Full build: ModernBERT-large as the backbone, fully fine-tuned, plus a decision head trained from scratch (two transformer layers, an option-marker scorer, and an act/escalate head). 421M parameters in total.", from: "model-card" },
      ],
    },
    state: {
      published: true,
      headline: { text: "512 tokens per question on the English checkpoint, 1,024 on the multilingual one.", from: "model-card" },
      body: [
        { text: "Separately, the decision head has its own budget for the options: `head_max_len` is 192 tokens on English, 256 on multilingual. That number matters, and question 6 explains why.", from: "model-card" },
        { text: "Every question in a call is answered in a single forward pass.", from: "model-card" },
      ],
    },
    options: {
      published: true,
      headline: { text: "Every option you send gets its own `[MASK]` token.", from: "model-card" },
      body: [
        { text: "The model scores each of those markers, then softmaxes across them, and that distribution is the answer. This is the part worth reading twice.", from: "model-card" },
        { text: "Which means the answer space is defined at request time, not at training time. The options live in your request, so new schemas need no retraining.", from: "model-card" },
        { text: "That is how a model trained on support tickets can answer `LANE_LEFT` versus `IDLE` on a highway: nobody taught it to drive, they taught it to read a situation and score the markers you supply." },
      ],
    },
    calibration: {
      published: true,
      headline: { text: "RLCD, Reinforcement Learning for Calibrated Decisions, with the method published.", from: "model-card" },
      body: [
        { text: "The policy reports a probability distribution. Exploration adds zero-mean Gaussian noise to the logits. The reward is a strictly proper scoring rule (log and spherical, plus ranked probability score for ordinal questions). Updates are REINFORCE with a group-mean baseline, the same idea as GRPO.", from: "model-card" },
        { text: "The phrase doing the work is strictly proper. Under such a rule, the only way to maximise expected reward is to report the probabilities you actually believe. Overclaiming is punished, so honesty is the optimal policy rather than a good intention." },
        { text: "TypeSafe uses the same name for Jev's training without publishing any of this.", from: "inference", because: "from the absence of a published method" },
      ],
    },
    cost: {
      published: true,
      rows: [
        { label: "Price", claim: { text: "Free. Apache 2.0. You pay for hardware, and nothing leaves your machine.", from: "model-card" } },
        { label: "Install", claim: { text: "`pip install laya`. Weights, about 2.3 GB, download from Hugging Face on first use." } },
        { label: "Speed, stated", claim: { text: "39.5 ms for one question on a T4 GPU, 32.8 ms on the multilingual checkpoint", from: "model-card" } },
        { label: "Speed, measured", claim: { text: "p50 107 to 185 ms across the three games, on a laptop CPU with no GPU", from: "measured" } },
      ],
      table: {
        head: ["Checkpoint", "Backbone", "Params", "Context", "Aimed at"],
        rows: [
          ["laya", "ModernBERT-large", "421M", "512", "English, guardrails, email triage"],
          ["laya-multilingual", "mmBERT-base", "322M", "1,024", "100+ languages, about 2.2x faster"],
          ["laya-typed-decisions", "ModernBERT-large", "421M", "1,024", "the four typed-decision workflows"],
        ],
        from: "model-card",
      },
    },
    limits: {
      published: true,
      bullets: [
        { lead: "Handle many options well.", claims: [
          { text: "The options share that fixed `head_max_len` budget, so 77 options get roughly 3 tokens each and the labels blur together. On Banking77, Convai report Laya at 0.425 against Jev's 0.870.", from: "model-card" },
          { text: "The limit is a consequence of the mechanism in question 3, not a mystery." },
        ] },
        { lead: "Match Jev on soft distributions.", claims: [{ text: "Higher argmax accuracy on typed decisions (0.766 against 0.727) but lower soft accuracy (0.471 against 0.580).", from: "model-card" }] },
        { lead: "Arrive calibrated out of the box.", claims: [{ text: "Its 0.081 ECE comes after domain temperature fitting. Raw, the base checkpoint is worse than Jev.", from: "model-card" }] },
      ],
    },
  },
  measured: {
    intro: { text: "Three games, zero training, 10 episodes each, on CPU.", from: "measured" },
    bullets: [
      { lead: "Blackjack:", claims: [{ text: "chose stick on all 200 decisions, scoring exactly like an always-stick baseline. Matched basic strategy 49.5% of the time, which is what you get by not deciding.", from: "measured" }] },
      { lead: "Highway:", claims: [{ text: "64% of its moves were lane changes into a lane that did not exist. Average survival 18.1 seconds against Jev's 40.", from: "measured" }] },
      { lead: "Confidence runs backwards:", claims: [{ text: "when it claimed 80 to 90%, it was right about 55% of the time; when it claimed 90 to 100%, about a third.", from: "measured" }] },
    ],
    note: [
      { lead: "The fairness note.", claims: [
        { text: "This is a fair result for these games and an unfair one for the model. Laya was built for support tickets, moderation and routing, not for driving. On its own published benchmarks it beats Jev on accuracy (0.766 against 0.727 on typed decisions, 0.950 against 0.910 on AG News) and is three times better calibrated (ECE 0.081 against 0.246).", from: "model-card", because: "and Convai note that the Jev figures there are third-party published, not measured by them" },
      ] },
      { claims: [{ text: "What these games measure is not which model is better. It is how far each one travels from the domain it was trained on, and games are much further from Laya's home than from Jev's." }] },
      { claims: [{ text: "Its weights are open, so the obvious experiment is to fine-tune it on decisions like these and put it back in the arena. That is the next thing on the list." }] },
    ],
  },
  sources: [
    { text: "The Laya model card on Hugging Face, and `encoder/config.json` in the downloaded weights", href: "https://huggingface.co/convaiinnovations/laya" },
    { text: "Laya on GitHub", href: "https://github.com/NandhaKishorM/laya" },
    { text: RUNS.text, href: "/results/" },
  ],
};

export const MODELS: Record<ModelId, Model> = { jev: JEV, laya: LAYA };
