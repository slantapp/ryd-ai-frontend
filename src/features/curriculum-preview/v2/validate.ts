const BEAT_TYPES = new Set([
  "speak",
  "display",
  "media",
  "code_demo",
  "formula_demo",
  "question",
  "pause",
  "recap",
  "bridge",
]);

const ADVANCE_MODES = new Set(["auto", "manual", "on_answer"]);

const VALID_LEVELS = ["Beginner", "Intermediate", "Advanced"];

function validateCodeExample(
  value: unknown,
  label: string,
  errors: string[],
): void {
  if (!value || typeof value !== "object") {
    errors.push(`${label}: code_example must be an object`);
    return;
  }
  const ex = value as Record<string, unknown>;
  if (!ex.code || typeof ex.code !== "string") {
    errors.push(`${label}: code_example requires a 'code' string`);
  }
  if (!ex.language || typeof ex.language !== "string") {
    errors.push(`${label}: code_example requires a 'language' string`);
  }
  if (
    ex.starterCode !== undefined &&
    typeof ex.starterCode !== "string"
  ) {
    errors.push(`${label}: code_example.starterCode must be a string when provided`);
  }
}

function validateFormulaExample(
  value: unknown,
  label: string,
  errors: string[],
): void {
  if (!value || typeof value !== "object") {
    errors.push(`${label}: formula_example must be an object`);
    return;
  }
  const ex = value as Record<string, unknown>;
  if (!ex.formula || typeof ex.formula !== "string") {
    errors.push(`${label}: formula_example requires a 'formula' string`);
  }
}

function validateQuestion(
  q: Record<string, unknown>,
  label: string,
  errors: string[],
): void {
  const qType = q.type;
  if (
    qType !== "multiple_choice" &&
    qType !== "true_false" &&
    qType !== "code_test" &&
    qType !== "formula_test"
  ) {
    errors.push(`${label}: invalid question type`);
    return;
  }
  if (!q.question || typeof q.question !== "string") {
    errors.push(`${label}: missing question text`);
  }
  if (qType === "code_test" && q.code_example) {
    validateCodeExample(q.code_example, label, errors);
  }
  if (qType === "formula_test") {
    const criteria = q.testCriteria as Record<string, unknown> | undefined;
    if (!criteria?.expectedFormula || typeof criteria.expectedFormula !== "string") {
      errors.push(`${label}: formula_test requires testCriteria.expectedFormula`);
    }
  }
}

function validateBeat(
  beat: unknown,
  label: string,
  errors: string[],
): void {
  if (!beat || typeof beat !== "object") {
    errors.push(`${label} is invalid`);
    return;
  }
  const b = beat as Record<string, unknown>;
  if (!b.id || typeof b.id !== "string") {
    errors.push(`${label}: missing 'id'`);
  }
  if (!b.type || typeof b.type !== "string" || !BEAT_TYPES.has(b.type)) {
    errors.push(
      `${label}: invalid type (must be one of: ${[...BEAT_TYPES].join(", ")})`,
    );
    return;
  }
  if (!b.advance || typeof b.advance !== "string" || !ADVANCE_MODES.has(b.advance)) {
    errors.push(`${label}: advance must be auto, manual, or on_answer`);
  }

  switch (b.type) {
    case "speak": {
      const avatar = b.avatar as Record<string, unknown> | undefined;
      if (!avatar?.text || typeof avatar.text !== "string") {
        errors.push(`${label}: speak beat requires avatar.text`);
      }
      break;
    }
    case "display":
      if (!b.body || typeof b.body !== "string") {
        errors.push(`${label}: display beat requires 'body'`);
      }
      if (b.speak_body !== undefined && typeof b.speak_body !== "boolean") {
        errors.push(`${label}: speak_body must be a boolean`);
      }
      break;
    case "media": {
      const media = b.media as Record<string, unknown> | undefined;
      if (!media || (!media.image && !media.video)) {
        errors.push(`${label}: media beat requires media.image or media.video`);
      }
      break;
    }
    case "code_demo":
      validateCodeExample(b.code_example, label, errors);
      break;
    case "formula_demo":
      validateFormulaExample(b.formula_example, label, errors);
      break;
    case "question":
      if (b.advance !== "on_answer") {
        errors.push(`${label}: question beats should use advance "on_answer"`);
      }
      if (!b.question || typeof b.question !== "object") {
        errors.push(`${label}: question beat requires a 'question' object`);
      } else {
        validateQuestion(
          b.question as Record<string, unknown>,
          `${label} question`,
          errors,
        );
      }
      if (b.retry !== undefined) {
        if (!b.retry || typeof b.retry !== "object") {
          errors.push(`${label}: retry must be an object`);
        } else {
          const retry = b.retry as Record<string, unknown>;
          if (
            retry.max !== undefined &&
            (typeof retry.max !== "number" ||
              !Number.isFinite(retry.max) ||
              retry.max < 0)
          ) {
            errors.push(`${label}: retry.max must be a non-negative number`);
          }
          if (retry.hint !== undefined && typeof retry.hint !== "string") {
            errors.push(`${label}: retry.hint must be a string`);
          }
          if (
            retry.on_exhausted !== undefined &&
            retry.on_exhausted !== "continue"
          ) {
            errors.push(`${label}: retry.on_exhausted must be "continue"`);
          }
        }
      }
      break;
    case "pause":
      if (b.advance !== "manual") {
        errors.push(`${label}: pause beats should use advance "manual"`);
      }
      if (
        b.keep_previous !== undefined &&
        typeof b.keep_previous !== "boolean"
      ) {
        errors.push(`${label}: keep_previous must be a boolean`);
      }
      break;
    case "recap":
      if (!Array.isArray(b.points) || b.points.length === 0) {
        errors.push(`${label}: recap beat requires a non-empty 'points' array`);
      }
      break;
    case "bridge":
      if (b.next !== null && typeof b.next !== "string") {
        errors.push(`${label}: bridge.next must be a lesson id string or null`);
      }
      break;
  }
}

export function validateCurriculumV2(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["File must contain a valid JSON object"] };
  }

  const root = data as Record<string, unknown>;
  let curriculumData: Record<string, unknown>;

  if ("curriculum" in root && typeof root.curriculum === "object" && root.curriculum) {
    curriculumData = root.curriculum as Record<string, unknown>;
    if (root.schema_version !== undefined && root.schema_version !== 2) {
      errors.push("schema_version must be 2 for flow-based curricula");
    }
  } else if ("title" in root && "modules" in root) {
    curriculumData = root;
  } else {
    return {
      valid: false,
      errors: [
        "Invalid structure: must have 'title' and 'modules', or be wrapped in 'curriculum'",
      ],
    };
  }

  if (!curriculumData.title || typeof curriculumData.title !== "string") {
    errors.push("Missing or invalid 'title'");
  }
  if (!curriculumData.description || typeof curriculumData.description !== "string") {
    errors.push("Missing or invalid 'description'");
  }
  if (
    typeof curriculumData.age !== "number" ||
    !Number.isFinite(curriculumData.age) ||
    curriculumData.age < 1
  ) {
    errors.push("Missing or invalid 'age'");
  }
  if (!curriculumData.class || typeof curriculumData.class !== "string") {
    errors.push("Missing or invalid 'class'");
  }
  if (
    !curriculumData.category ||
    typeof curriculumData.category !== "string" ||
    !curriculumData.category.trim()
  ) {
    errors.push("Missing or invalid 'category' (non-empty string)");
  }
  if (
    curriculumData.level !== undefined &&
    (typeof curriculumData.level !== "string" ||
      !VALID_LEVELS.includes(curriculumData.level))
  ) {
    errors.push("Invalid 'level' (Beginner, Intermediate, or Advanced)");
  }

  const defaults = curriculumData.defaults as Record<string, unknown> | undefined;
  if (defaults?.question_retry !== undefined) {
    const qr = defaults.question_retry;
    if (!qr || typeof qr !== "object") {
      errors.push("defaults.question_retry must be an object");
    } else {
      const retry = qr as Record<string, unknown>;
      if (
        retry.max !== undefined &&
        (typeof retry.max !== "number" ||
          !Number.isFinite(retry.max) ||
          retry.max < 0)
      ) {
        errors.push("defaults.question_retry.max must be a non-negative number");
      }
      if (retry.hint !== undefined && typeof retry.hint !== "string") {
        errors.push("defaults.question_retry.hint must be a string");
      }
      if (
        retry.on_exhausted !== undefined &&
        retry.on_exhausted !== "continue"
      ) {
        errors.push('defaults.question_retry.on_exhausted must be "continue"');
      }
    }
  }

  if (!Array.isArray(curriculumData.modules) || curriculumData.modules.length === 0) {
    errors.push("Curriculum must have at least one module");
    return { valid: errors.length === 0, errors };
  }

  (curriculumData.modules as unknown[]).forEach((mod, mi) => {
    if (!mod || typeof mod !== "object") {
      errors.push(`Module ${mi + 1} is invalid`);
      return;
    }
    const m = mod as Record<string, unknown>;
    if (!m.id) errors.push(`Module ${mi + 1}: missing 'id'`);
    if (!m.title) errors.push(`Module ${mi + 1}: missing 'title'`);
    if (!Array.isArray(m.lessons) || m.lessons.length === 0) {
      errors.push(`Module ${mi + 1}: needs at least one lesson`);
      return;
    }

    (m.lessons as unknown[]).forEach((les, li) => {
      if (!les || typeof les !== "object") {
        errors.push(`Module ${mi + 1}, Lesson ${li + 1} is invalid`);
        return;
      }
      const lesson = les as Record<string, unknown>;
      const label = `Module ${mi + 1}, Lesson ${li + 1}`;
      if (!lesson.id) errors.push(`${label}: missing 'id'`);
      if (!lesson.title) errors.push(`${label}: missing 'title'`);
      if (!Array.isArray(lesson.flow) || lesson.flow.length === 0) {
        errors.push(`${label}: needs a non-empty 'flow' array of beats`);
        return;
      }
      (lesson.flow as unknown[]).forEach((beat, bi) => {
        validateBeat(beat, `${label}, Beat ${bi + 1}`, errors);
      });
    });
  });

  return { valid: errors.length === 0, errors };
}
