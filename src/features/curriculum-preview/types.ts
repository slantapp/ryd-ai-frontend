export interface Question {
  id?: string;
  type: "multiple_choice" | "true_false" | "code_test";
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
  testCriteria?: {
    expectedVariable?: string;
    expectedValue?: unknown;
    expectedValues?: unknown[];
    expectedFunction?: string;
    expectedHTML?: string;
    expectedCSS?: string;
    expectedJS?: string;
    expectedCode?: string;
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
export type CurriculumCategory = "coding" | "design" | "data" | "careers";

export interface CurriculumData {
  title: string;
  description: string;
  language: string;
  /** Category for folder grouping on the course listing page. */
  category: CurriculumCategory;
  /** Minimum recommended learner age (years). */
  age: number;
  /**
   * Local school class label (e.g. "Primary 5", "JSS 1", or "Grade 5").
   */
  class: string;
  /**
   * Optional international grade number (1–12). Shown compactly alongside `class`.
   */
  grade?: number;
  modules: Module[];
}

export interface Curriculum {
  slug: string;
  curriculum: CurriculumData;
}
