import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import NarratorAvatar from "narrator-avatar";
import { Volume2 } from "lucide-react";
import { stopAvatarSpeech } from "@/utils/stopAvatarSpeech";

type NarratorAvatarRef = {
  speakText: (text: string, options?: Record<string, unknown>) => void;
  stopSpeaking: () => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;
};

export interface PreviewAvatarHandle {
  speak: (text: string) => void;
  stop: () => void;
  isReady: () => boolean;
}

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

export function usePreviewAvatar() {
  const avatarRef = useRef<NarratorAvatarRef | null>(null);
  const avatarReadyRef = useRef(false);
  const pendingSpeechQueueRef = useRef<string[]>([]);
  const [showMobileAudioUnlock, setShowMobileAudioUnlock] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [selectedInstructor, setSelectedInstructor] = useState<"woman" | "man">("woman");

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
      if (avatarRef.current && text && typeof avatarRef.current.speakText === "function") {
        avatarRef.current.speakText(text);
      }
    } catch (error) {
      console.warn("Error speaking text:", error);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!avatarReadyRef.current) {
        pendingSpeechQueueRef.current.push(text);
        return;
      }
      speakImmediate(text);
    },
    [speakImmediate]
  );

  const stop = useCallback(() => {
    try {
      pendingSpeechQueueRef.current = [];
      setShowMobileAudioUnlock(false);
      stopAvatarSpeech(avatarRef.current);
      setIsSpeaking(false);
      setCurrentSubtitle("");
    } catch (error) {
      console.warn("Error stopping speech:", error);
    }
  }, []);

  const flushNextQueuedSpeech = useCallback(() => {
    const queue = pendingSpeechQueueRef.current;
    if (queue.length === 0) return;
    const next = queue.shift()!;
    speakImmediate(next);
  }, [speakImmediate]);

  const handleAvatarReady = useCallback(() => {
    avatarReadyRef.current = true;
    const queue = pendingSpeechQueueRef.current;
    if (queue.length === 0) {
      setShowMobileAudioUnlock(false);
      return;
    }
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    if (isMobile) {
      setShowMobileAudioUnlock(true);
      return;
    }
    flushNextQueuedSpeech();
  }, [flushNextQueuedSpeech]);

  const handleMobileAudioUnlock = useCallback(() => {
    setShowMobileAudioUnlock(false);
    flushNextQueuedSpeech();
  }, [flushNextQueuedSpeech]);

  const handleSpeechStart = useCallback(() => {
    setIsSpeaking(true);
  }, []);

  const handleSpeechEnd = useCallback(() => {
    setIsSpeaking(false);
    setCurrentSubtitle("");
    flushNextQueuedSpeech();
  }, [flushNextQueuedSpeech]);

  const handleSubtitle = useCallback((text: string) => {
    setCurrentSubtitle(text);
  }, []);

  const isReady = useCallback(() => avatarReadyRef.current, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

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
