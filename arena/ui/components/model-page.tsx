import { QUESTIONS, type Model, type QuestionId } from "@/lib/learn";
import { Answer, ClaimLine, Notes, QuestionSection, Section, Sources } from "./learn-page";

/**
 * Both model pages are this component. They answer the same six questions in the
 * same order, from lib/learn.ts, so neither page can quietly grow an answer the
 * other one lacks.
 */
export function ModelPage({ model, after }: {
  model: Model;
  /** Anything that belongs under one answer on this model's page only, such as a diagram. */
  after?: Partial<Record<QuestionId, React.ReactNode>>;
}) {
  return (
    <>
      <Notes notes={model.preface} className="mt-8" />

      {QUESTIONS.map((q, i) => (
        <QuestionSection key={q.id} n={i + 1} id={`q-${q.id}`} title={q.title}>
          <Answer answer={model.answers[q.id]} />
          {after?.[q.id]}
        </QuestionSection>
      ))}

      <Section title="What we measured">
        <ClaimLine claim={model.measured.intro} />
      </Section>
      <Notes notes={model.measured.bullets} className="mt-4 text-body leading-relaxed" />
      {model.measured.note && <Notes notes={model.measured.note} className="mt-6 text-body leading-relaxed" />}

      <Section title="Sources">
        <Sources items={model.sources} />
      </Section>
    </>
  );
}
