import type { CodeExample, FormulaExample } from "@/data/curriculumData";

export type { CodeExample, FormulaExample };

export interface Question {
  id?: string;
  type: "multiple_choice" | "true_false" | "code_test" | "formula_test";
  question: string;
  options?: string[];
  answer?: string | boolean;
  explanation?: string;
  code_example?: CodeExample;
  formula_example?: FormulaExample;
  testCriteria?: {
    expectedVariable?: string;
    expectedValue?: unknown;
    expectedValues?: unknown[];
    expectedFunction?: string;
    expectedHTML?: string;
    expectedCSS?: string;
    expectedJS?: string;
    expectedCode?: string;
    expectedFormula?: string;
    testCases?: Array<{
      input: unknown[];
      expected: unknown;
    }>;
  };
}

export interface Lesson {
  id: string;
  title: string;
  body: string;
  avatar_script: string;
  media: {
    image?: string;
    video?: string;
  };
  /** Mathematics curricula only — optional worked example after the avatar script. */
  formula_example?: FormulaExample;
  questions: Question[];
  next_lesson_id: string | null;
}

/** Coding curricula only — extends Lesson with an optional post-script code demo. */
export interface CodingLesson extends Lesson {
  code_example?: CodeExample;
}

export interface Module {
  id: string;
  title: string;
  prerequisite: string | null;
  lessons: Array<Lesson | CodingLesson>;
}

/** Category for grouping courses in the library folder view. */
export type CurriculumCategory =
  | "coding"
  | "design"
  | "data"
  | "careers"
  | "mathematics"
  | "english";

export type CurriculumLevel = "Beginner" | "Intermediate" | "Advanced";

export interface CurriculumData {
  title: string;
  description: string;
  language: string;
  category: CurriculumCategory;
  age: number;
  class: string;
  grade?: number;
  duration?: string;
  level?: CurriculumLevel;
  rating?: number;
  modules: Module[];
}

export interface Curriculum {
  slug: string;
  curriculum: CurriculumData;
}

export function isMathematicsPreview(curriculum: CurriculumData): boolean {
  return curriculum.category === "mathematics";
}

export type PublishStatus = "idle" | "uploading" | "published";
