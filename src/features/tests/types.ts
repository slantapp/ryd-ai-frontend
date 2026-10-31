/** Interactive tests (API: /parent/ai-test/*). Answers are never sent before a card is answered. */

export type TestQuestionType =
  | "code_prediction"
  | "multiple_choice"
  | "true_false"
  | "fill_blank"
  | "match_pairs";

export type TestLevel = "Beginner" | "Intermediate" | "Advanced";

export type AttemptStatus = "in_progress" | "submitted" | "expired";

export interface TestIntro {
  id: number;
  title: string;
  description: string | null;
  curriculumId: number | null;
  courseSlug: string | null;
  courseTitle: string | null;
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
