/** Interactive tests (API: /parent/ai-test/*). Answers are never sent before a card is answered. */

export type TestQuestionType =
  | "code_prediction"
  | "multiple_choice"
  | "true_false"
  | "fill_blank"
  | "match_pairs"
  | "order_lines"
  | "build_answer"
  | "spot_mistake"
  | "select_all"
  | "type_output"
  | "place_on_line"
  | "sort_buckets"
  | "listen_answer"
  | "trace_steps"
  | "spot_bug"
  | "speed_round";

export type TestLevel = "Beginner" | "Intermediate" | "Advanced";

export type AttemptStatus = "in_progress" | "submitted" | "expired";

export interface TaxonomyLink {
  id: number;
  title: string;
  slug: string;
  icon: string | null;
  /** Admin order (Learning path categories); missing from older API builds. */
  sortOrder?: number;
}

export interface TestIntro {
  id: number;
  title: string;
  description: string | null;
  curriculumId: number | null;
  courseSlug: string | null;
  courseTitle: string | null;
  /** Learning-path taxonomy (Coding → Python); null when the test has no category. */
  category: TaxonomyLink | null;
  subcategory: TaxonomyLink | null;
  /** Admin display order; the API already returns tests sorted by it. */
  sortOrder: number;
  language: string | null;
  level: TestLevel | null;
  timeLimitMinutes: number | null;
  passMark: number;
  maxAttempts: number | null;
  instantFeedback: boolean;
  questionCount: number;
  types: TestQuestionType[];
}

export interface BestResult {
  attemptId: number;
  percent: number;
  grade: string | null;
  passed: boolean | null;
  /** Questions not right on the first try, including any left blank. */
  missed?: number | null;
  total?: number | null;
}

/** Where an unfinished attempt stopped. `question` is 1-based. */
export interface OpenProgress {
  question: number;
  total: number;
}

export interface AttemptSummary {
  id: number;
  testId: number;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  expiresAt: string | null;
  score: number | null;
  maxScore: number | null;
  percent: number | null;
  grade: string | null;
  passed: boolean | null;
  durationSeconds: number | null;
}

export interface LearnerTestCard extends TestIntro {
  attemptsUsed: number;
  /** null = unlimited */
  attemptsLeft: number | null;
  best: BestResult | null;
  openAttemptId: number | null;
  openProgress?: OpenProgress | null;
  lastAttemptAt: string | null;
}

export interface LearnerTestDetail extends LearnerTestCard {
  attempts: AttemptSummary[];
}

export interface QuestionOption {
  id: string;
  label: string;
}

interface QuestionBase {
  id: number;
  prompt: string;
  code: string | null;
  points: number;
}

export type PublicQuestion =
  | (QuestionBase & { type: "code_prediction" | "multiple_choice"; options: QuestionOption[] })
  | (QuestionBase & { type: "true_false" })
  | (QuestionBase & { type: "fill_blank"; pre: string; post: string; options: string[] })
  | (QuestionBase & {
      type: "match_pairs";
      left: { id: string; text: string }[];
      right: { token: string; text: string }[];
    })
  | (QuestionBase & {
      type: "order_lines";
      lines: { id: string; text: string }[];
      slotCount: number;
    })
  | (QuestionBase & { type: "build_answer"; tiles: { id: string; text: string }[] })
  | (QuestionBase & { type: "spot_mistake"; steps: string[] })
  | (QuestionBase & { type: "select_all"; options: QuestionOption[] })
  | (QuestionBase & { type: "type_output"; maxLength: number; keypad: "numeric" | "text" })
  | (QuestionBase & { type: "place_on_line"; ticks: number; leftLabel: string; rightLabel: string })
  | (QuestionBase & {
      type: "sort_buckets";
      items: { id: string; text: string }[];
      buckets: { id: string; label: string }[];
    })
  | (QuestionBase & {
      type: "listen_answer";
      spokenText: string;
      showTextAllowed: boolean;
      options: QuestionOption[];
    })
  | (QuestionBase & {
      type: "trace_steps";
      lines: string[];
      steps: { options: (string | number)[]; hint: string | null }[];
    })
  | (QuestionBase & {
      type: "spot_bug";
      lines: string[];
      expectedOutput: string;
      actualOutput: string;
      clue: string | null;
      fixes: { id: string; text: string; output: string | null }[];
    })
  | (QuestionBase & {
      type: "speed_round";
      seconds: number;
      facts: { id: string; prompt: string }[];
    });

/** What the server already knows about a card (used to resume after a refresh). */
export interface LiveFeedback {
  done: boolean;
  tries: number;
  correct?: boolean;
  firstTryCorrect?: boolean;
  value?: unknown;
  explanation?: string | null;
  correctAnswer?: unknown;
  matched?: { left: string; right: string }[];
}

export type AttemptQuestion = PublicQuestion & { feedback: LiveFeedback | null };

export interface AttemptView extends AttemptSummary {
  serverNow: string;
  test: TestIntro;
  questions: AttemptQuestion[];
}

export interface AnswerResponse {
  recorded: boolean;
  done: boolean;
  correct?: boolean;
  /** Learning-mode try count after this submit. */
  tries?: number;
  explanation?: string | null;
  correctAnswer?: unknown;
  matchedCount?: number;
  progress: { answeredCount: number; total: number };
}

export interface ReviewLesson {
  courseSlug: string;
  lessonId: string | null;
  lessonTitle: string | null;
}

export type RecommendationAction =
  | "next_course"
  | "next_level"
  | "review_lessons"
  | "retake_test"
  | "learning_path"
  | "none";

export interface CourseLink {
  id: number;
  slug: string;
  title: string;
}

export interface Recommendation {
  grade: string;
  label: string | null;
  message: string | null;
  action: RecommendationAction;
  nextCourse: CourseLink | null;
  nextLevel?: string | null;
  learningPath: CourseLink | null;
  reviewLessons: ReviewLesson[];
  course: CourseLink | null;
  canRetake: boolean;
  /** The test's own pick: after a pass a course or a test, after a fail a course. Missing on older results. */
  followUp?: {
    when: "pass" | "fail";
    course: CourseLink | null;
    test: { id: number; title: string } | null;
  } | null;
  byType?: Partial<Record<TestQuestionType, { total: number; correct: number; score: number; maxScore: number }>>;
  correctCount?: number;
  total?: number;
}

export interface ReviewItem {
  question: PublicQuestion;
  explanation: string | null;
  lessonRef: ReviewLesson | null;
  correctAnswer: unknown;
  answer: {
    value: unknown;
    matched: string[] | null;
    missed: string[] | null;
    correct: boolean;
    firstTryCorrect: boolean;
    score: number;
    tries: number;
  } | null;
}

export interface AttemptResult extends AttemptSummary {
  test: TestIntro;
  attemptsLeft: number | null;
  recommendation: Recommendation | null;
  review: ReviewItem[];
}

export interface ResultHistoryRow extends AttemptSummary {
  testTitle: string | null;
  courseTitle: string | null;
  courseSlug: string | null;
  level: TestLevel | null;
}
