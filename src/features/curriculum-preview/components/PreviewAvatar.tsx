import { useRef, useMemo, useCallback, useState, useEffect, type RefObject } from "react";
import NarratorAvatar from "narrator-avatar";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  applySubtitleShow,
  type SpeechUtterance,
} from "@/features/curriculum-preview/v2/subtitleShow";
import type { AvatarShowReplacement } from "@/features/curriculum-preview/v2/types";
import {
  createSpeechRewindTracker,
  REWIND_RESPEAK_DELAY_MS,
  REWIND_SECONDS,
} from "@/utils/speechRewind";

type NarratorAvatarRef = {
  speakText: (text: string, options?: Record<string, unknown>) => void;
  stopSpeaking: () => void;
  pauseSpeaking: () => void;
  resumeSpeaking: () => void;
  resumeAudioContext?: () => Promise<void>;
};

export type SpeakOptions = {
  show?: AvatarShowReplacement[];
};

export interface PreviewAvatarHandle {
  speak: (text: string, options?: SpeakOptions) => void;
  stop: () => void;
  isReady: () => boolean;
}

export type PreviewAvatarOptions = {
  /**
   * `global` — use the instructor from settings / subscription gate (persisted).
   * `local` — isolated picker for curriculum preview authoring (default).
   */
  instructorSource?: "local" | "global";
  /** When false, suppress the instructor wait banner (e.g. before "Start lesson"). */
  lessonActive?: boolean;
};

function isMobileViewport() {
  return typeof window !== "undefined"
    ? window.matchMedia("(max-width: 1023px)").matches
    : false;
}

/** Matches CourseDetails NarratorAvatar sizing so WebGL gets a real layout box. */
export const PREVIEW_AVATAR_CLASS =
  "h-full w-full min-h-0 min-w-0 max-h-full max-w-full";

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
  onMobileAudioUnlock,
}: PreviewAvatarViewProps) {
  return (
    <div className={cn("relative min-h-0 min-w-0", className)}>
      <NarratorAvatar
        key={selectedInstructor}
        ref={avatarRef}
        {...avatarConfig}
        onReady={onReady}
        onError={(error: unknown) => console.error("Avatar error:", error)}
        onSpeechStart={onSpeechStart}
        onSpeechEnd={onSpeechEnd}
        onSubtitle={onSubtitle}
        className={PREVIEW_AVATAR_CLASS}
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
  const pendingSpeechQueueRef = useRef<SpeechUtterance[]>([]);
  /** Phrase swaps for the utterance currently being spoken. */
  const activeShowRef = useRef<AvatarShowReplacement[] | undefined>(undefined);
  /** Lesson-level fallback (classic v1 `avatar_show`) when speak() omits options. */
  const defaultShowRef = useRef<AvatarShowReplacement[] | undefined>(undefined);
  /** Runs once after the current utterance finishes (and any queued speech is flushed). */
  const afterSpeechRef = useRef<(() => void) | null>(null);
  /** Tracks live playback position inside the current utterance (for rewind). */
  const rewindTracker = useMemo(() => createSpeechRewindTracker(), []);
  /** Drops the speech-end event that stopping mid-utterance triggers. */
  const suppressSpeechEndUntilRef = useRef(0);
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
      speechRate: 0.9,
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
    (utterance: SpeechUtterance) => {
      try {
        if (!utterance.text) return;

        if (!isAvatarLive()) {
          pendingSpeechQueueRef.current.push(utterance);
          syncPendingSpeech();
          setAwaitingSpeech(true);
          markAvatarNotReady();
          return;
        }

        activeShowRef.current = utterance.show ?? defaultShowRef.current;
        rewindTracker.beginUtterance(utterance.text);
        setAwaitingSpeech(true);
        avatarRef.current!.speakText(utterance.text);
      } catch (error) {
        console.warn("Error speaking text:", error);
        setAwaitingSpeech(false);
      }
    },
    [isAvatarLive, markAvatarNotReady, rewindTracker, syncPendingSpeech],
  );

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      if (!text) return;
      const utterance: SpeechUtterance = { text, show: options?.show };

      // Queue when the 3D avatar is still loading or was remounted (stale ready flag).
      if (!avatarReadyRef.current || !isAvatarLive()) {
        if (!isAvatarLive()) {
          markAvatarNotReady();
        }
        pendingSpeechQueueRef.current.push(utterance);
        syncPendingSpeech();
        setAwaitingSpeech(true);
        return;
      }

      // Mobile: never autoplay until the user taps (even if avatar is already ready).
      if (needsMobileUnlock()) {
        pendingSpeechQueueRef.current.push(utterance);
        syncPendingSpeech();
        setAwaitingSpeech(true);
        setShowMobileAudioUnlock(true);
        return;
      }

      speakImmediate(utterance);
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
      rewindTracker.noteResume();
      setIsPaused(false);
      setIsSpeaking(true);
    } else {
      rewindTracker.notePause();
      avatar.pauseSpeaking?.();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  }, [isPaused, rewindTracker]);

  const rewindSpeaking = useCallback(() => {
    if (!isSpeaking && !isPaused) return;
    const slice = rewindTracker.computeRewind(REWIND_SECONDS);
    if (!slice) return;

    const avatar = avatarRef.current;
    if (!avatar || typeof avatar.speakText !== "function") return;

    // Stopping mid-utterance makes the avatar report speech-end; letting that
    // through would flush the queue and jump the lesson forward.
    suppressSpeechEndUntilRef.current = Date.now() + REWIND_RESPEAK_DELAY_MS * 3;
    stopAvatarSpeech(avatar);
    rewindTracker.beginChunk(slice.startIndex);

    setIsPaused(false);
    setIsSpeaking(true);
    setAwaitingSpeech(true);
    setCurrentSubtitle("");

    // Keep the AudioContext alive inside this tap (WebKit autoplay policy).
    void avatar.resumeAudioContext?.().catch(() => {
      // Suspended until speakText — expected on some WebKit builds.
    });

    window.setTimeout(() => {
      const live = avatarRef.current;
      if (!live || typeof live.speakText !== "function") {
        setAwaitingSpeech(false);
        return;
      }
      try {
        live.speakText(slice.text);
      } catch (error) {
        console.warn("Error rewinding speech:", error);
        setAwaitingSpeech(false);
      }
    }, REWIND_RESPEAK_DELAY_MS);
  }, [isPaused, isSpeaking, rewindTracker]);

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
      activeShowRef.current = undefined;
      rewindTracker.reset();
      suppressSpeechEndUntilRef.current = 0;
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentSubtitle("");
    } catch (error) {
      console.warn("Error stopping speech:", error);
    }
  }, [rewindTracker]);

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
    suppressSpeechEndUntilRef.current = 0;
    rewindTracker.noteAudioStart();
    setIsSpeaking(true);
    setIsPaused(false);
    setAwaitingSpeech(false);
  }, [rewindTracker]);

  const handleSpeechEnd = useCallback(() => {
    if (Date.now() < suppressSpeechEndUntilRef.current) return;
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

  const handleSubtitle = useCallback(
    (text: string) => {
      rewindTracker.noteSubtitle(text);
      setCurrentSubtitle(applySubtitleShow(text, activeShowRef.current));
    },
    [rewindTracker],
  );

  const setDefaultShow = useCallback((show?: AvatarShowReplacement[]) => {
    defaultShowRef.current = show && show.length > 0 ? show : undefined;
  }, []);

  const isReady = useCallback(() => avatarReadyRef.current, []);

  useEffect(() => {
    avatarReadyRef.current = false;
    setIsAvatarReady(false);
    setAwaitingSpeech(false);
    setHasPendingSpeech(false);
  }, [selectedInstructor]);

  /** Preload GLB so the instructor model is requested as soon as preview mounts. */
  useEffect(() => {
    const url = instructorConfig.avatarUrl;
    if (!url) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "fetch";
    link.href = url;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    void fetch(url).catch(() => {
      /* best-effort warm cache */
    });
    return () => {
      link.remove();
    };
  }, [instructorConfig.avatarUrl]);

  const isInstructorWaiting = isInstructorWaitActive({
    isPaused,
    hasPendingSpeech,
    awaitingSpeech,
    lessonActive,
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
        onMobileAudioUnlock={handleMobileAudioUnlock}
      />
    ),
    [
      avatarConfig,
      handleAvatarReady,
      handleSpeechStart,
      handleSpeechEnd,
      handleSubtitle,
      showMobileAudioUnlock,
      handleMobileAudioUnlock,
      selectedInstructor,
    ],
  );

  /** Render a fresh avatar mount (never reuse the returned element in two places). */
  const renderAvatar = useCallback(
    (className = "h-full w-full", showUnlockOverlay = true) => (
      <AvatarComponent
        className={className}
        showUnlockOverlay={showUnlockOverlay}
      />
    ),
    [AvatarComponent],
  );

  return {
    AvatarComponent,
    renderAvatar,
    speak,
    stop,
    scheduleAfterSpeech,
    clearScheduledAfterSpeech,
    setDefaultShow,
    isReady,
    isAvatarReady,
    isInstructorWaiting,
    isSpeaking,
    isPaused,
    togglePause,
    rewindSpeaking,
    currentSubtitle,
    selectedInstructor,
    setSelectedInstructor,
    showMobileAudioUnlock,
    unlockMobileAudio: handleMobileAudioUnlock,
  };
}
