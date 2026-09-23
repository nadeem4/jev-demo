import { describe, expect, it } from "vitest";
import { JEV, LAYA, QUESTIONS, pairAnswers, provenanceLabel, splitCode } from "./learn";

describe("provenanceLabel", () => {
  it("names the source in the words the drafts use", () => {
    expect(provenanceLabel({ text: "x", from: "model-card" })).toBe("model card");
    expect(provenanceLabel({ text: "x", from: "config" })).toBe("config.json");
    expect(provenanceLabel({ text: "x", from: "measured" })).toBe("measured here");
  });

  it("reads an inference and its grounds as one phrase", () => {
    expect(provenanceLabel({ text: "x", from: "inference", because: "from the absence of a published method" }))
      .toBe("our inference, from the absence of a published method");
  });

  it("has nothing to show for a sentence that makes no factual claim", () => {
    expect(provenanceLabel({ text: "x" })).toBeNull();
  });
});

describe("splitCode", () => {
  it("leaves plain prose in one piece", () => {
    expect(splitCode("an encoder")).toEqual([{ text: "an encoder", code: false }]);
  });

  it("pulls backticked spans out so they can be set in monospace", () => {
    expect(splitCode("say `config.json` here")).toEqual([
      { text: "say ", code: false },
      { text: "config.json", code: true },
      { text: " here", code: false },
    ]);
  });

  it("keeps every character, so nothing is lost in the rendering", () => {
    const text = "`pip install laya` downloads `2.3 GB`";
    expect(splitCode(text).map((p) => (p.code ? `\`${p.text}\`` : p.text)).join("")).toBe(text);
  });
});

describe("pairAnswers", () => {
  it("pairs the two models question by question, in the drafts' order", () => {
    const pairs = pairAnswers(JEV, LAYA);
    expect(pairs.map((p) => p.question.id)).toEqual(QUESTIONS.map((q) => q.id));
  });

  it("names the model that has published no answer, when only one has not", () => {
    const pairs = pairAnswers(JEV, LAYA);
    const kind = pairs.find((p) => p.question.id === "kind")!;
    expect(kind.unpublished).toBe("jev");
    expect(kind.jev.published).toBe(false);
    expect(kind.laya.published).toBe(true);
  });

  it("names nobody when both models answer the question", () => {
    expect(pairAnswers(JEV, LAYA).find((p) => p.question.id === "cost")!.unpublished).toBeNull();
  });

  it("names nobody when neither model answers, so the page cannot claim a contrast", () => {
    const silent = { ...LAYA, answers: { ...LAYA.answers, kind: { ...LAYA.answers.kind, published: false } } };
    expect(pairAnswers(JEV, silent).find((p) => p.question.id === "kind")!.unpublished).toBeNull();
  });
});

describe("the six questions", () => {
  it("are answered by both models, so the three pages cannot drift apart", () => {
    for (const model of [JEV, LAYA]) {
      for (const q of QUESTIONS) {
        const answer = model.answers[q.id];
        expect(answer, `${model.id} answers ${q.id}`).toBeTruthy();
        expect(Boolean(answer.headline || answer.rows?.length || answer.bullets?.length)).toBe(true);
      }
    }
  });
});
