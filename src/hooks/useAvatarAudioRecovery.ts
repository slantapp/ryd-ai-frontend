import { useEffect, type RefObject } from "react";

type AvatarAudioRef = {
  resumeSpeaking?: () => void;
  resumeAudioContext?: () => Promise<void>;
} | null;

/**
 * Keeps avatar TTS alive when mobile browsers suspend audio (tab switch, lock screen, flaky network).
 * Call from any page that drives NarratorAvatar or CurriculumLearning speech.
 */
export function useAvatarAudioRecovery(
  avatarRef: RefObject<AvatarAudioRef>,
  isSpeaking: boolean,
) {
  useEffect(() => {
    const resumePlayback = () => {
      const avatar = avatarRef.current;
      if (!avatar) return;

      avatar.resumeAudioContext?.().catch(() => {
        // AudioContext may stay suspended until the next user gesture — expected on iOS.
      });

      if (isSpeaking) {
        try {
          avatar.resumeSpeaking?.();
        } catch {
          // ignore
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resumePlayback();
      }
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        resumePlayback();
      }
    };

    const onOnline = () => {
      resumePlayback();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", resumePlayback);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", resumePlayback);
      window.removeEventListener("online", onOnline);
    };
  }, [avatarRef, isSpeaking]);
}
