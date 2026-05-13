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
  code_example?: {
    code: string;
    language: string;
    description?: string;
    explanation?: string;
    autoRun?: boolean;
    typingSpeed?: number;
  };
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

export interface CurriculumData {
  title: string;
  description: string;
  language: string;
  modules: Module[];
}

export interface Curriculum {
  slug: string;
  curriculum: CurriculumData;
}
