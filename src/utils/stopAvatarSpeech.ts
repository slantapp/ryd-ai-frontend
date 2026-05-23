type AvatarSpeechRef = {
  stopSpeaking?: () => void;
} | null;

/**
 * Stop narrator avatar speech and any in-flight browser audio.
 * Call on route change and component unmount — parent cleanup often runs after
 * the avatar ref is already cleared.
 */
export function stopAvatarSpeech(avatar?: AvatarSpeechRef) {
  try {
    avatar?.stopSpeaking?.();
  } catch {
    // ignore
  }

  try {
    window.speechSynthesis?.cancel?.();
  } catch {
    // ignore
  }

  try {
    document.querySelectorAll("audio").forEach((el) => {
      el.pause();
      el.currentTime = 0;
      el.src = "";
      el.load();
    });
  } catch {
    // ignore
  }
}
