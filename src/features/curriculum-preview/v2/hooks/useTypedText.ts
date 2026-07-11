import { useCallback, useEffect, useRef, useState } from "react";

/** Types text character-by-character (code or formula demos). */
export function useTypedText() {
  const [text, setText] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setText("");
  }, [stop]);

  const type = useCallback(
    (full: string, speed = 40, onComplete?: () => void) => {
      stop();
      setText("");
      activeRef.current = true;
      let i = 0;

      const tick = () => {
        if (!activeRef.current) return;
        if (i < full.length) {
          i += 1;
          setText(full.slice(0, i));
          timeoutRef.current = setTimeout(tick, speed);
        } else {
          activeRef.current = false;
          onComplete?.();
        }
      };

      timeoutRef.current = setTimeout(tick, 300);
    },
    [stop],
  );

  useEffect(() => () => stop(), [stop]);

  return { text, type, stop, reset, setText };
}
