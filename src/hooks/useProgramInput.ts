import { useCallback, useEffect, useRef, useState } from "react";
import {
  assignPrefill,
  joinPromptAnswers,
  programInputState,
  type ProgramInputSeed,
} from "@/utils/programInput";

export type ProgramInputPrompt = {
  open: boolean;
  index: number;
  total: number;
  label: string;
  snippet: string;
  line: number;
  value: string;
  confirmLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onCancel: () => void;
};

/** Input for the current example or question. Resets when `key` changes. */
export function useProgramInput(seed: ProgramInputSeed) {
  const offer = programInputState(seed);
  const [value, setValue] = useState(offer.prefill);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [confirmLabel, setConfirmLabel] = useState("Run program");
  const keyRef = useRef(seed.key);
  const offerRef = useRef(offer);
  const valueRef = useRef(value);
  const answersRef = useRef(answers);
  const waiter = useRef<((result: string | undefined | null) => void) | null>(
    null,
  );

  offerRef.current = offer;
  valueRef.current = value;
  answersRef.current = answers;

  const finish = useCallback((result: string | undefined | null) => {
    setOpen(false);
    const resolve = waiter.current;
    waiter.current = null;
    resolve?.(result);
  }, []);

  useEffect(() => {
    if (keyRef.current === seed.key) return;
    keyRef.current = seed.key;
    setValue(offer.prefill);
    finish(null);
  }, [seed.key, offer.prefill, finish]);

  useEffect(() => {
    if (!open) return;
    if (offer.mode !== "prompt" || step >= offer.prompts.length) finish(null);
  }, [open, offer.mode, offer.prompts.length, step, finish]);

  useEffect(() => () => finish(null), [finish]);

  const collect = useCallback(
    (actionLabel = "Run program") => {
      const current = offerRef.current;
      if (current.mode !== "prompt" || current.prompts.length === 0) {
        return Promise.resolve<string | undefined | null>(
          current.show ? valueRef.current : undefined,
        );
      }
      return new Promise<string | undefined | null>((resolve) => {
        waiter.current?.(null);
        waiter.current = resolve;
        setConfirmLabel(actionLabel);
        setAnswers(assignPrefill(current.prefill, current.prompts.length));
        setStep(0);
        setOpen(true);
      });
    },
    [],
  );

  const currentPrompt = offer.prompts[step];
  const prompt: ProgramInputPrompt | null =
    open && currentPrompt
      ? {
          open: true,
          index: step,
          total: offer.prompts.length,
          label: currentPrompt.label,
          snippet: currentPrompt.snippet,
          line: currentPrompt.line,
          value: answers[step] ?? "",
          confirmLabel,
          onChange: (next) => {
            const copy = [...answersRef.current];
            copy[step] = next;
            answersRef.current = copy;
            setAnswers(copy);
          },
          onSubmit: () => {
            if (step < offer.prompts.length - 1) {
              setStep((current) => current + 1);
              return;
            }
            finish(joinPromptAnswers(answersRef.current));
          },
          onBack: () => setStep((current) => Math.max(0, current - 1)),
          onCancel: () => finish(null),
        }
      : null;

  return {
    show: offer.show,
    hint: offer.hint,
    value,
    setValue,
    stdin: offer.show ? value : undefined,
    collect,
    prompt,
  };
}
