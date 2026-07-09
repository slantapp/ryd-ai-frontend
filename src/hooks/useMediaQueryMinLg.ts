import { useEffect, useState } from "react";

/** True when viewport is at least Tailwind `lg` (1024px). */
export function useMediaQueryMinLg() {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    onChange();
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return matches;
}
