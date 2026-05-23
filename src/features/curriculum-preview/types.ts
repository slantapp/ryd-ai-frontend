export interface FormulaExample {
  formula: string;
  subject?: string;
  description?: string;
  explanation?: string;
  autoRun?: boolean;
  typingSpeed?: number;
}

export interface Question {
  id?: string;
  type: "multiple_choice" | "true_false" | "code_test" | "formula_test";
  question: string;
  options?: string[];
  answer?: string | boolean;
  explanation?: string;
  code_example?: {
    code: string;
    language: string;
    description?: string;
    explanation?: string;
    autoRun?: boolean;
    typingSpeed?: number;
  };
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
  formula_example?: FormulaExample;
  questions: Question[];
  next_lesson_id: string | null;
}

export interface Module {
  id: string;
  title: string;
  prerequisite: string | null;
  lessons: Lesson[];
}

/** Category for grouping courses in the library folder view. */
export type CurriculumCategory =
  | "coding"
  | "design"
  | "data"
  | "careers"
  | "mathematics";

export interface CurriculumData {
  title: string;
  description: string;
  language: string;
  category: CurriculumCategory;
  age: number;
  class: string;
  grade?: number;
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
