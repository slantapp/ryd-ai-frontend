import { useRef, useMemo, useCallback, useState, useEffect, type RefObject } from "react";
import NarratorAvatar from "narrator-avatar";
import { Volume2 } from "lucide-react";
import {
  INSTRUCTORS,
  useInstructorStore,
  type InstructorType,
} from "@/stores/instructorStore";
import { stopAvatarSpeech } from "@/utils/stopAvatarSpeech";
import { isInstructorWaitActive } from "@/hooks/isInstructorWaitActive";
import {
  MOBILE_INSTRUCTOR_AUDIO_BUTTON,
  MOBILE_INSTRUCTOR_AUDIO_HINT,
} from "@/constants/mobileInstructorAudio";

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

export type PreviewAvatarOptions = {
  /**
   * `global` — use the instructor from settings / subscription gate (persisted).
   * `local` — isolated picker for curriculum preview authoring (default).
   */
  instructorSource?: "local" | "global";
  /** When false, suppress the wait banner (e.g. pre-start gate screen). Default true. */
  lessonActive?: boolean;
};

function isMobileViewport() {
  return typeof window !== "undefined"
    ? window.matchMedia("(max-width: 1023px)").matches
    : false;
}

type PreviewAvatarViewProps = {
  className?: string;
  showUnlockOverlay?: boolean;
  avatarRef: RefObject<NarratorAvatarRef | null>;
  avatarConfig: Record<string, unknown>;
  selectedInstructor: InstructorType;
  showMobileAudioUnlock: boolean;
  onReady: () => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onSubtitle: (text: string) => void;
  onUnmount: () => void;
  onMobileAudioUnlock: () => void;
};

function PreviewAvatarView({
  className,
  showUnlockOverlay = true,
  avatarRef,
  avatarConfig,
  selectedInstructor,
  showMobileAudioUnlock,
  onReady,
  onSpeechStart,
  onSpeechEnd,
  onSubtitle,
  onUnmount,
  onMobileAudioUnlock,
}: PreviewAvatarViewProps) {
  useEffect(() => onUnmount, [onUnmount]);

  return (
    <div className={`relative ${className || ""}`}>
      <NarratorAvatar
        key={selectedInstructor}
        ref={avatarRef}
        {...avatarConfig}
        onReady={onReady}
        onError={(error: unknown) => console.error("Avatar error:", error)}
        onSpeechStart={onSpeechStart}
        onSpeechEnd={onSpeechEnd}
        onSubtitle={onSubtitle}
        className="h-full w-full"
      />
      {showUnlockOverlay && showMobileAudioUnlock && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/50 px-4 backdrop-blur-sm">
          <p className="max-w-xs text-center text-xs leading-snug text-white/90">
            {MOBILE_INSTRUCTOR_AUDIO_HINT}
          </p>
          <button
            type="button"
            onClick={onMobileAudioUnlock}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary/90"
          >
            <Volume2 className="h-5 w-5" />
            <span>{MOBILE_INSTRUCTOR_AUDIO_BUTTON}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function usePreviewAvatar(options: PreviewAvatarOptions = {}) {
  const instructorSource = options.instructorSource ?? "local";
  const lessonActive = options.lessonActive ?? true;

  const globalInstructor = useInstructorStore((s) => s.selectedInstructor);
  const setGlobalInstructor = useInstructorStore((s) => s.setSelectedInstructor);

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
  const [isPaused, setIsPaused] = useState(false);
  const [awaitingSpeech, setAwaitingSpeech] = useState(false);
  const [hasPendingSpeech, setHasPendingSpeech] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [localInstructor, setLocalInstructor] =
    useState<InstructorType>("woman");

  const selectedInstructor =
    instructorSource === "global" ? globalInstructor : localInstructor;
  const setSelectedInstructor =
    instructorSource === "global" ? setGlobalInstructor : setLocalInstructor;

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

  const syncPendingSpeech = useCallback(() => {
    setHasPendingSpeech(pendingSpeechQueueRef.current.length > 0);
  }, []);

  /** True when the live avatar ref can accept speakText right now. */
  const isAvatarLive = useCallback(() => {
    const avatar = avatarRef.current;
    return !!(avatar && typeof avatar.speakText === "function");
  }, []);

  const markAvatarNotReady = useCallback(() => {
    avatarReadyRef.current = false;
    setIsAvatarReady(false);
  }, []);

  const speakImmediate = useCallback(
    (text: string) => {
      try {
        if (!text) return;

        if (!isAvatarLive()) {
          pendingSpeechQueueRef.current.push(text);
          syncPendingSpeech();
          setAwaitingSpeech(true);
          markAvatarNotReady();
          return;
        }

        setAwaitingSpeech(true);
        avatarRef.current!.speakText(text);
      } catch (error) {
        console.warn("Error speaking text:", error);
        setAwaitingSpeech(false);
      }
    },
    [isAvatarLive, markAvatarNotReady, syncPendingSpeech],
  );

  const speak = useCallback(
    (text: string) => {
      if (!text) return;

      // Queue when the 3D avatar is still loading or was remounted (stale ready flag).
      if (!avatarReadyRef.current || !isAvatarLive()) {
        if (!isAvatarLive()) {
          markAvatarNotReady();
        }
        pendingSpeechQueueRef.current.push(text);
        syncPendingSpeech();
        setAwaitingSpeech(true);
        return;
      }

      // Mobile: never autoplay until the user taps (even if avatar is already ready).
      if (needsMobileUnlock()) {
        pendingSpeechQueueRef.current.push(text);
        syncPendingSpeech();
        setAwaitingSpeech(true);
        setShowMobileAudioUnlock(true);
        return;
      }

      speakImmediate(text);
    },
    [
      isAvatarLive,
      markAvatarNotReady,
      needsMobileUnlock,
      speakImmediate,
      syncPendingSpeech,
    ],
  );

  /** Pause the instructor mid-sentence, or resume from the same point. */
  const togglePause = useCallback(() => {
    const avatar = avatarRef.current;
    if (!avatar) return;
    if (isPaused) {
      avatar.resumeSpeaking?.();
      setIsPaused(false);
      setIsSpeaking(true);
    } else {
      avatar.pauseSpeaking?.();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  }, [isPaused]);

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
      setHasPendingSpeech(false);
      setAwaitingSpeech(false);
      // Keep mobileAudioUnlockedRef — one tap unlocks the whole session.
      setShowMobileAudioUnlock(false);
      stopAvatarSpeech(avatarRef.current);
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentSubtitle("");
    } catch (error) {
      console.warn("Error stopping speech:", error);
    }
  }, []);

  const flushNextQueuedSpeech = useCallback(() => {
    const queue = pendingSpeechQueueRef.current;
    if (queue.length === 0) {
      syncPendingSpeech();
      return;
    }
    const next = queue.shift()!;
    syncPendingSpeech();
    speakImmediate(next);
  }, [speakImmediate, syncPendingSpeech]);

  const handleAvatarReady = useCallback(() => {
    avatarReadyRef.current = true;
    setIsAvatarReady(true);

    const queued = pendingSpeechQueueRef.current.length > 0;

    // Match CourseDetails v1: on mobile only prompt when speech is already queued.
    if (needsMobileUnlock()) {
      if (queued) {
        setShowMobileAudioUnlock(true);
      }
      return;
    }

    if (isMobileViewport() && mobileAudioUnlockedRef.current) {
      void avatarRef.current?.resumeAudioContext?.().catch(() => {
        // Suspended until speakText — expected on some WebKit builds.
      });
    }

    flushNextQueuedSpeech();
  }, [flushNextQueuedSpeech, needsMobileUnlock]);

  const handleMobileAudioUnlock = useCallback(() => {
    mobileAudioUnlockedRef.current = true;
    setShowMobileAudioUnlock(false);

    const resume = avatarRef.current?.resumeAudioContext?.();
    if (resume) {
      void resume
        .then(() => flushNextQueuedSpeech())
        .catch(() => flushNextQueuedSpeech());
      return;
    }

    flushNextQueuedSpeech();
  }, [flushNextQueuedSpeech]);

  const handleSpeechStart = useCallback(() => {
    setIsSpeaking(true);
    setIsPaused(false);
    setAwaitingSpeech(false);
  }, []);

  const handleSpeechEnd = useCallback(() => {
    setIsSpeaking(false);
    setIsPaused(false);
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
    avatarReadyRef.current = false;
    setIsAvatarReady(false);
    setAwaitingSpeech(false);
    setHasPendingSpeech(false);
  }, [selectedInstructor]);

  const isInstructorWaiting = isInstructorWaitActive({
    isPaused,
    lessonActive,
    hasPendingSpeech,
    awaitingSpeech,
  });

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
      showUnlockOverlay?: boolean;
    }) => (
      <PreviewAvatarView
        className={className}
        showUnlockOverlay={showUnlockOverlay}
        avatarRef={avatarRef}
        avatarConfig={avatarConfig}
        selectedInstructor={selectedInstructor}
        showMobileAudioUnlock={showMobileAudioUnlock}
        onReady={handleAvatarReady}
        onSpeechStart={handleSpeechStart}
        onSpeechEnd={handleSpeechEnd}
        onSubtitle={handleSubtitle}
        onUnmount={markAvatarNotReady}
        onMobileAudioUnlock={handleMobileAudioUnlock}
      />
    ),
    [
      avatarConfig,
      handleAvatarReady,
      handleSpeechStart,
      handleSpeechEnd,
      handleSubtitle,
      markAvatarNotReady,
      showMobileAudioUnlock,
      handleMobileAudioUnlock,
      selectedInstructor,
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
    isInstructorWaiting,
    isSpeaking,
    isPaused,
    togglePause,
    currentSubtitle,
    selectedInstructor,
    setSelectedInstructor,
    showMobileAudioUnlock,
    unlockMobileAudio: handleMobileAudioUnlock,
  };
}
