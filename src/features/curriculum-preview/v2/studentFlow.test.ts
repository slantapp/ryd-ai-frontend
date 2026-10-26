import assert from "node:assert/strict";
import test from "node:test";
import { codeAttemptHint, resolveQuestionRetry } from "./studentFlow.ts";
import type { CurriculumV2Data, QuestionBeat } from "./types.ts";

function beat(type: string): QuestionBeat {
  return {
    id: "q",
    type: "question",
    advance: "on_answer",
    question: { type, question: "Try it" },
  } as QuestionBeat;
}

function curriculum(
  level?: "Beginner" | "Intermediate",
  max?: number,
): CurriculumV2Data {
  return {
    title: "t",
    description: "d",
    language: "en",
    category: "coding",
    age: 11,
    class: "Primary 6",
    level,
    defaults: max != null ? { question_retry: { max } } : undefined,
    modules: [],
  };
}

test("beginner code gets three tries unless the lesson sets a max", () => {
  assert.equal(resolveQuestionRetry(beat("code_test"), curriculum("Beginner")).max, 3);
  assert.equal(
    resolveQuestionRetry(beat("code_test"), curriculum("Intermediate")).max,
    2,
  );
  assert.equal(
    resolveQuestionRetry(beat("multiple_choice"), curriculum("Beginner")).max,
    2,
  );
  assert.equal(
    resolveQuestionRetry(beat("code_test"), curriculum("Beginner", 5)).max,
    5,
  );
  assert.equal(resolveQuestionRetry(beat("code_test"), curriculum()).max, 2);
});

test("the second miss speaks what the program printed", () => {
  assert.equal(
    codeAttemptHint({
      attempt: 1,
      authoredHint: "Read the console.",
      failure: "Your program printed: Bye",
    }),
    "Read the console.",
  );
  assert.match(
    codeAttemptHint({
      attempt: 2,
      authoredHint: "Read the console.",
      failure: "Your program printed:\nBye\nThe lesson wanted:\nHi",
    }) ?? "",
    /Your program printed: Bye The lesson wanted: Hi/,
  );
  assert.match(
    codeAttemptHint({
      attempt: 2,
      runLines: [
        "IndentationError on line 2: the lines inside an if must be indented by the same amount.",
      ],
    }) ?? "",
    /IndentationError on line 2/,
  );
});
