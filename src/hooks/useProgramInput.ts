import { useEffect, useRef, useState } from "react";
import {
  programInputState,
  type ProgramInputSeed,
} from "@/utils/programInput";

/** Input box value for the current example or question. Resets when `key` changes. */
export function useProgramInput(seed: ProgramInputSeed) {
  const offer = programInputState(seed);
  const [value, setValue] = useState(offer.prefill);
  const keyRef = useRef(seed.key);

  useEffect(() => {
    if (keyRef.current === seed.key) return;
    keyRef.current = seed.key;
    setValue(offer.prefill);
  }, [seed.key, offer.prefill]);

  return {
    show: offer.show,
    value,
    setValue,
    stdin: offer.show ? value : undefined,
  };
}
