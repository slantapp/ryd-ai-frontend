import { useRef, useMemo, useCallback, useState } from "react";
import NarratorAvatar from "narrator-avatar";
import { Volume2 } from "lucide-react";
import type { InstructorType } from "../types";

type NarratorAvatarRef = {
  speakText: (text: string, options?: Record<string, unknown>) => void;
  stopSpeaking: () => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;
};

const INSTRUCTORS = {
  woman: {
    avatarUrl: "/avatars/avatar.glb",
    avatarBody: "F" as const,
    ttsVoice: "aura-2-aurora-en",
  },
  man: {
    avatarUrl: "/avatars/male.glb",
    avatarBody: "M" as const,
    ttsVoice: "aura-2-mars-en",
  },
};

export function useMarketingAvatar() {
  const avatarRef = useRef<NarratorAvatarRef | null>(null);
  const avatarReadyRef = useRef(false);
  const pendingSpeechRef = useRef<string | null>(null);
  const [showMobileAudioUnlock, setShowMobileAudioUnlock] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [selectedInstructor, setSelectedInstructor] =
    useState<InstructorType>("woman");

  const instructorConfig = INSTRUCTORS[selectedInstructor];

  const avatarConfig = useMemo(
    () => ({
      cameraView: "mid" as const,
      avatarUrl: instructorConfig.avatarUrl,
      avatarBody: instructorConfig.avatarBody,
      ttsService: "deepgram" as const,
      ttsVoice: instructorConfig.ttsVoice,
      ttsApiKey: import.meta.env.VITE_DEEPGRAM_API_KEY,
      lipsyncModules: ["en"] as const,
      lipsyncLang: "en",
      speechRate: 0.95,
      accurateLipSync: true,
    }),
    [instructorConfig]
  );

  const speakImmediate = useCallback((text: string) => {
    try {
      if (
        avatarRef.current &&
        text &&
        typeof avatarRef.current.speakText === "function"
      ) {
        avatarRef.current.speakText(text);
      }
    } catch (error) {
      console.warn("Error speaking text:", error);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!avatarReadyRef.current) {
        pendingSpeechRef.current = text;
        return;
      }
      speakImmediate(text);
    },
    [speakImmediate]
  );

  const stop = useCallback(() => {
    try {
      pendingSpeechRef.current = null;
      setShowMobileAudioUnlock(false);
      if (
        avatarRef.current &&
        typeof avatarRef.current.stopSpeaking === "function"
      ) {
        avatarRef.current.stopSpeaking();
      }
      setIsSpeaking(false);
      setCurrentSubtitle("");
    } catch (error) {
      console.warn("Error stopping speech:", error);
    }
    try {
      window.speechSynthesis?.cancel?.();
    } catch {
      // ignore
    }
  }, []);

  const flushPendingSpeech = useCallback(() => {
    const pending = pendingSpeechRef.current;
    if (!pending) return;
    pendingSpeechRef.current = null;
    speakImmediate(pending);
  }, [speakImmediate]);

  const handleAvatarReady = useCallback(() => {
    avatarReadyRef.current = true;
    const pending = pendingSpeechRef.current;
    if (!pending) {
      setShowMobileAudioUnlock(false);
      return;
    }
    const isMobile =
      typeof window !== "undefined" && window.innerWidth < 1024;
    if (isMobile) {
      setShowMobileAudioUnlock(true);
      return;
    }
    flushPendingSpeech();
  }, [flushPendingSpeech]);

  const handleMobileAudioUnlock = useCallback(() => {
    setShowMobileAudioUnlock(false);
    flushPendingSpeech();
  }, [flushPendingSpeech]);

  const handleSpeechStart = useCallback(() => {
    setIsSpeaking(true);
  }, []);

  const handleSpeechEnd = useCallback(() => {
    setIsSpeaking(false);
    setCurrentSubtitle("");
  }, []);

  const handleSubtitle = useCallback((text: string) => {
    setCurrentSubtitle(text);
  }, []);

  const isReady = useCallback(() => avatarReadyRef.current, []);

  const AvatarComponent = useCallback(
    ({ className }: { className?: string }) => (
      <div className={`relative ${className || ""}`}>
        <NarratorAvatar
          ref={avatarRef}
          {...avatarConfig}
          onReady={handleAvatarReady}
          onError={(error: unknown) => console.error("Avatar error:", error)}
          onSpeechStart={handleSpeechStart}
          onSpeechEnd={handleSpeechEnd}
          onSubtitle={handleSubtitle}
          className="h-full w-full"
        />
        {showMobileAudioUnlock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl">
            <button
              type="button"
              onClick={handleMobileAudioUnlock}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary/90"
            >
              <Volume2 className="h-5 w-5" />
              <span>Tap to enable voice</span>
            </button>
          </div>
        )}
      </div>
    ),
    [
      avatarConfig,
      handleAvatarReady,
      handleSpeechStart,
      handleSpeechEnd,
      handleSubtitle,
      showMobileAudioUnlock,
      handleMobileAudioUnlock,
    ]
  );

  return {
    AvatarComponent,
    speak,
    stop,
    isReady,
    isSpeaking,
    currentSubtitle,
    selectedInstructor,
    setSelectedInstructor,
  };
}
