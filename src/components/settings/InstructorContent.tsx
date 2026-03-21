import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import NarratorAvatar from "narrator-avatar";
import {
  useInstructorStore,
  INSTRUCTORS,
  type InstructorType,
} from "@/stores/instructorStore";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface NarratorAvatarRef {
  speakText: (text: string, options?: Record<string, unknown>) => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;
  stopSpeaking: () => void;
}

// Preview text for each instructor
const getPreviewText = (instructor: InstructorType): string => {
  const greetings = {
    woman:
      "Hello! I'm Frank. This is how I will look and sound when teaching you. I'm excited to help you learn and grow!",
    man: "Hello! I'm Frank. This is how I will look and sound when teaching you. I'm excited to help you learn and grow!",
  };

  return greetings[instructor];
};

interface InstructorContentProps {
  hideHeader?: boolean;
}

const InstructorContent = ({ hideHeader = false }: InstructorContentProps) => {
  const { selectedInstructor, setSelectedInstructor } = useInstructorStore();
  const [activePreview, setActivePreview] = useState<InstructorType | null>(
    null
  );
  const womanRef = useRef<NarratorAvatarRef | null>(null);
  const manRef = useRef<NarratorAvatarRef | null>(null);

  // Pre-compute avatar configs
  const womanConfig = INSTRUCTORS.woman;
  const manConfig = INSTRUCTORS.man;

  const womanAvatarConfig = useMemo(
    () => ({
      cameraView: "mid" as const,
      avatarUrl: womanConfig.avatarUrl,
      avatarBody: womanConfig.avatarBody,
      ttsService: "deepgram" as const,
      ttsVoice: womanConfig.ttsVoice,
      ttsApiKey:
        import.meta.env?.VITE_DEEPGRAM_API_KEY ||
        "aa197cc0f30583ce6bf225517d5d8e0cdce506a7",
      lipsyncModules: ["en"] as const,
      lipsyncLang: "en",
      speechRate: 0.9,
      accurateLipSync: true,
    }),
    [womanConfig]
  );

  const manAvatarConfig = useMemo(
    () => ({
      cameraView: "mid" as const,
      avatarUrl: manConfig.avatarUrl,
      avatarBody: manConfig.avatarBody,
      ttsService: "deepgram" as const,
      ttsVoice: manConfig.ttsVoice,
      ttsApiKey:
        import.meta.env?.VITE_DEEPGRAM_API_KEY ||
        "aa197cc0f30583ce6bf225517d5d8e0cdce506a7",
      lipsyncModules: ["en"] as const,
      lipsyncLang: "en",
      speechRate: 0.9,
      accurateLipSync: true,
    }),
    [manConfig]
  );

  // Helper function to stop all avatars
  const stopAllAvatars = useCallback(() => {
    if (womanRef.current) {
      try {
        womanRef.current.stopSpeaking();
      } catch (error) {
        console.warn("Error stopping woman avatar:", error);
      }
    }
    if (manRef.current) {
      try {
        manRef.current.stopSpeaking();
      } catch (error) {
        console.warn("Error stopping man avatar:", error);
      }
    }
  }, []);

  // Speak on hover; avatar speaks regardless of selection
  useEffect(() => {
    stopAllAvatars();

    if (!activePreview) {
      return;
    }

    const ref = activePreview === "woman" ? womanRef : manRef;
    const previewText = getPreviewText(activePreview);

    const timeout = setTimeout(() => {
      if (ref.current && typeof ref.current.speakText === "function") {
        try {
          ref.current.speakText(previewText);
        } catch (error) {
          console.warn(`Error speaking for ${activePreview}:`, error);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      stopAllAvatars();
    };
  }, [activePreview, stopAllAvatars]);

  const handleSelectInstructor = (instructor: InstructorType) => {
    setSelectedInstructor(instructor);
  };

  const handlePreviewHover = (instructor: InstructorType) => {
    setActivePreview(instructor);
  };

  const handlePreviewLeave = () => {
    stopAllAvatars();
    setActivePreview(null);
  };

  const renderInstructorPreview = (
    instructor: InstructorType,
    ref: React.RefObject<NarratorAvatarRef | null>,
    config: (typeof INSTRUCTORS)[InstructorType],
    avatarConfig: typeof womanAvatarConfig
  ) => {
    const isSelected = selectedInstructor === instructor;
    const isActive = activePreview === instructor;

    return (
      <Card
        className={cn(
          "relative cursor-pointer transition-all duration-300 overflow-hidden",
          isSelected
            ? "ring-2 ring-primary shadow-lg"
            : "hover:shadow-md border-gray-200",
          isActive && "scale-[1.02]"
        )}
        onMouseEnter={() => handlePreviewHover(instructor)}
        onMouseLeave={handlePreviewLeave}
        onClick={() => handleSelectInstructor(instructor)}
      >
        <CardContent className="p-0">
          <div className="relative">
            {/* Preview Container */}
            <div className="relative w-full h-[300px] bg-linear-to-b from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full flex items-center justify-center">
                <NarratorAvatar
                  ref={ref}
                  {...avatarConfig}
                  onReady={() => {
                    console.log(`${instructor} avatar is ready`);
                  }}
                  onError={(error: unknown) => {
                    console.error(`${instructor} avatar error:`, error);
                  }}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Selection Indicator */}
            {isSelected && (
              <div className="absolute top-4 right-4 bg-primary text-white rounded-full p-2">
                <Check className="h-4 w-4" />
              </div>
            )}

            {/* Instructor Info */}
            <div className="p-4 bg-white">
              <h3 className="font-bold font-solway text-lg text-gray-900">
                {config.name}
              </h3>
              {config.description && (
                <p className="text-sm text-gray-600 mt-1 font-sans-serifbookflf">
                  {config.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {!hideHeader && (
        <div>
          <h2 className="mb-2 text-lg font-semibold font-solway text-gray-900">
            Change Instructor
          </h2>
          <p className="text-sm text-gray-600 font-sans-serifbookflf">
            Choose your preferred instructor for your courses. Hover over each
            option to hear them speak.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderInstructorPreview(
          "woman",
          womanRef,
          womanConfig,
          womanAvatarConfig
        )}
        {renderInstructorPreview("man", manRef, manConfig, manAvatarConfig)}
      </div>

      {selectedInstructor && (
        <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <p className="text-sm text-gray-700 font-sans-serifbookflf">
            <span className="font-semibold">Selected:</span>{" "}
            {INSTRUCTORS[selectedInstructor].name}
          </p>
        </div>
      )}
    </div>
  );
};

export default InstructorContent;
