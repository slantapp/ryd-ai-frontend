import { forwardRef, useMemo } from "react";
import { CurriculumLearning } from "@sage-rsc/talking-head-react";
import { type Curriculum, curriculumData } from "../../data/curriculumData";
import { useInstructorStore } from "../../stores/instructorStore";

interface CurriculumLearningRef {
  isAvatarReady?: () => boolean;
  resumeAudioContext?: () => Promise<void>;
  startTeaching?: () => void;
  startQuestions?: () => void;
  nextQuestion?: () => void;
  completeLesson?: () => void;
  nextLesson?: () => void;
  handleAnswerSelect?: (answer: string | boolean) => void;
  handleCodeTestResult?: (result: {
    passed: boolean;
    results: Array<{
      test: string;
      passed: boolean;
      actual?: unknown;
      expected?: unknown;
    }>;
    output: string;
    error: string | null;
    testCount: number;
    passedCount: number;
    failedCount: number;
  }) => void;
}

export interface ActionData {
  type: string;
  question?: unknown;
  testResult?: unknown;
  lessonId?: string;
  lesson?: unknown;
  hasQuestions?: boolean;
  questionIndex?: number;
  hasNextQuestion?: boolean;
  hasNextLesson?: boolean;
  hasNextModule?: boolean;
  codeExample?: {
    code: string;
    language: string;
    description?: string;
    autoRun?: boolean;
    typingSpeed?: number;
  };
}

interface AvatarContainerProps {
  onCustomAction: (actionData: ActionData) => void;
  onLessonStart?: (data: unknown) => void;
  onLessonComplete?: (data: unknown) => void;
  onQuestionAnswer?: (data: unknown) => void;
  className?: string;
  curriculum?: Curriculum["curriculum"];
}

const animations = {
  correct: "/animations/dance.fbx",
  incorrect: "/animations/Disappointed.fbx",
};

export const AvatarContainer = forwardRef<
  CurriculumLearningRef,
  AvatarContainerProps
>(
  (
    {
      onCustomAction,
      onLessonStart,
      onLessonComplete,
      onQuestionAnswer,
      className = "",
      curriculum,
    },
    ref
  ) => {
    const { getInstructorConfig } = useInstructorStore();
    const instructorConfig = getInstructorConfig();

    // Use provided curriculum or fallback to default
    const curriculumToUse = curriculum || curriculumData.curriculum;

    // Prepare curriculum data for CurriculumLearning component
    const transformedCurriculumData = useMemo(() => {
      if (!curriculumToUse) {
        console.warn("No curriculum data available");
        return { curriculum: curriculumData.curriculum };
      }
      // Wrap in curriculum property as expected by CurriculumLearning component
      return {
        curriculum: curriculumToUse,
      };
    }, [curriculumToUse]);

    // Build avatar config from selected instructor
    const avatarConfig = useMemo(
      () => ({
        avatarUrl: instructorConfig.avatarUrl,
        avatarBody: instructorConfig.avatarBody,
        ttsService: "deepgram" as const,
        ttsApiKey: import.meta.env.VITE_DEEPGRAM_API_KEY,
        // ttsApiKey: "aa197cc0f30583ce6bf225517d5d8e0cdce506a7",
        ttsVoice: instructorConfig.ttsVoice,
        // ttsService: "elevenlabs",
        // ttsVoice: "21m00Tcm4TlvDq8ikWAM",
        // ttsApiKey: "sk_809d74492f818fd38ae9a54dcf2157e0f2c5833d876d44b1",
        ttsLang: "en",
        showFullAvatar: false,
      }),
      [instructorConfig]
    );

    return (
      <div className={`w-full h-full relative ${className}`}>
        <CurriculumLearning
          ref={ref}
          curriculumData={transformedCurriculumData}
          avatarConfig={avatarConfig}
          animations={animations}
          autoStart={false}
          onLessonStart={onLessonStart || (() => { })}
          onLessonComplete={onLessonComplete || (() => { })}
          onQuestionAnswer={onQuestionAnswer || (() => { })}
          onCustomAction={onCustomAction}
        />
      </div>
    );
  }
);

AvatarContainer.displayName = "AvatarContainer";
