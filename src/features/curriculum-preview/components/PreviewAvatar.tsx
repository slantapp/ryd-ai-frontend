import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import NarratorAvatar from "narrator-avatar";
import { Volume2 } from "lucide-react";
import { stopAvatarSpeech } from "@/utils/stopAvatarSpeech";

type NarratorAvatarRef = {
  speakText: (text: string, options?: Record<string, unknown>) => void;
  stopSpeaking: () => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;
  resumeAudioContext?: () => Promise<void>;
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

function isMobileViewport() {
  return typeof window !== "undefined"
    ? window.matchMedia("(max-width: 1023px)").matches
    : false;
}

export function usePreviewAvatar() {
  const avatarRef = useRef<NarratorAvatarRef | null>(null);
  const avatarReadyRef = useRef(false);
  /** After one user tap on mobile, AudioContext/autoplay is allowed for the session. */
  const mobileAudioUnlockedRef = useRef(false);
  const pendingSpeechQueueRef = useRef<string[]>([]);
  /** Runs once after the current utterance finishes (and any queued speech is flushed). */
  const afterSpeechRef = useRef<(() => void) | null>(null);
  const [showMobileAudioUnlock, setShowMobileAudioUnlock] = useState(false);
  const [isAvatarReady, setIsAvatarReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [selectedInstructor, setSelectedInstructor] = useState<"woman" | "man">(
    "woman",
  );

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
    [instructorConfig],
  );

  const needsMobileUnlock = useCallback(() => {
    return isMobileViewport() && !mobileAudioUnlockedRef.current;
  }, []);

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
      // Not ready yet — queue and wait for onReady.
      if (!avatarReadyRef.current) {
        pendingSpeechQueueRef.current.push(text);
        return;
      }

      // Mobile: never autoplay until the user taps (even if avatar is already ready).
      // This is the race that used to hide the unlock button: onReady with an empty
      // queue skipped the CTA, then speakImmediate ran outside a gesture and failed.
      if (needsMobileUnlock()) {
        pendingSpeechQueueRef.current.push(text);
        setShowMobileAudioUnlock(true);
        return;
      }

      speakImmediate(text);
    },
    [needsMobileUnlock, speakImmediate],
  );

  const scheduleAfterSpeech = useCallback((fn: () => void) => {
    afterSpeechRef.current = fn;
  }, []);

  const clearScheduledAfterSpeech = useCallback(() => {
    afterSpeechRef.current = null;
  }, []);

  const stop = useCallback(() => {
    try {
      pendingSpeechQueueRef.current = [];
      afterSpeechRef.current = null;
      // Keep mobileAudioUnlockedRef — one tap unlocks the whole session.
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
    setIsAvatarReady(true);

    if (needsMobileUnlock()) {
      // Always show the tap CTA once the avatar can speak — do not require a
      // non-empty queue at this exact moment (lesson speech often starts after ready).
      setShowMobileAudioUnlock(true);
      return;
    }

    flushNextQueuedSpeech();
  }, [flushNextQueuedSpeech, needsMobileUnlock]);

  const handleMobileAudioUnlock = useCallback(() => {
    mobileAudioUnlockedRef.current = true;
    setShowMobileAudioUnlock(false);

    // Best-effort AudioContext resume inside the user gesture.
    void avatarRef.current?.resumeAudioContext?.().catch(() => {
      // Suspended until speakText — expected on some WebKit builds.
    });

    flushNextQueuedSpeech();
  }, [flushNextQueuedSpeech]);

  const handleSpeechStart = useCallback(() => {
    setIsSpeaking(true);
  }, []);

  const handleSpeechEnd = useCallback(() => {
    setIsSpeaking(false);
    setCurrentSubtitle("");
    const hadQueuedSpeech = pendingSpeechQueueRef.current.length > 0;
    flushNextQueuedSpeech();
    if (hadQueuedSpeech) return;

    const fn = afterSpeechRef.current;
    if (fn) {
      afterSpeechRef.current = null;
      fn();
    }
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
    ({
      className,
      showUnlockOverlay = true,
    }: {
      className?: string;
      /** When false, parent shows its own unlock CTA (e.g. kids stage mobile). */
      showUnlockOverlay?: boolean;
    }) => (
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
        {showUnlockOverlay && showMobileAudioUnlock && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 backdrop-blur-sm">
            <button
              type="button"
              onClick={handleMobileAudioUnlock}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary/90"
            >
              <Volume2 className="h-5 w-5" />
              <span>Tap to start lesson</span>
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
    ],
  );

  return {
    AvatarComponent,
    speak,
    stop,
    scheduleAfterSpeech,
    clearScheduledAfterSpeech,
    isReady,
    isAvatarReady,
    isSpeaking,
    currentSubtitle,
    selectedInstructor,
    setSelectedInstructor,
    showMobileAudioUnlock,
    unlockMobileAudio: handleMobileAudioUnlock,
  };
}
