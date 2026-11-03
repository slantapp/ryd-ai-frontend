import { useCallback, useEffect, useRef, useState } from "react";
import { END_OF_INPUT, type ConsoleQuestion } from "@/utils/codeTestRunner";
import {
  assignPrefill,
  joinPromptAnswers,
  programInputState,
  type ProgramInputSeed,
} from "@/utils/programInput";

export type ProgramInputPrompt = {
  open: boolean;
  /** One text area for every line the program reads (programs that read until the input ends). */
  multiline: boolean;
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

/** One answer the running program is waiting for (shown in a pop-up). */
export type ConsoleInputLine = {
  prompt: string;
  /** What the program printed just before asking. */
  recent: string[];
  /** 1-based number of this answer in the run. */
  number: number;
  /** The program reads until the input ends: offer "No more input". */
  canEnd: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** No more input: the program sees the end of input. */
  onEnd: () => void;
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
  const [question, setQuestion] = useState<
    { prompt: string; value: string; recent: string[]; number: number; canEnd: boolean } | null
  >(null);
  const keyRef = useRef(seed.key);
  const offerRef = useRef(offer);
  const valueRef = useRef(value);
  const answersRef = useRef(answers);
  const questionValue = useRef("");
  const lineWaiter = useRef<((result: string | null) => void) | null>(null);
  const waiter = useRef<((result: string | undefined | null) => void) | null>(
    null,
  );

  offerRef.current = offer;
  valueRef.current = value;
  answersRef.current = answers;

  const answerLine = useCallback((result: string | null) => {
    setQuestion(null);
    const resolve = lineWaiter.current;
    lineWaiter.current = null;
    resolve?.(result);
  }, []);

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
    answerLine(null);
  }, [seed.key, offer.prefill, finish, answerLine]);

  useEffect(() => {
    if (!open) return;
    const asks = offer.mode === "prompt" || offer.mode === "lines";
    if (!asks || step >= offer.prompts.length) finish(null);
  }, [open, offer.mode, offer.prompts.length, step, finish]);

  useEffect(
    () => () => {
      finish(null);
      answerLine(null);
    },
    [finish, answerLine],
  );

  const collect = useCallback(
    (actionLabel = "Run program") => {
      const current = offerRef.current;
      // Live input asks in the console while the program runs. The lesson's answers are the defaults.
      if (current.mode === "live") {
        return Promise.resolve<string | undefined | null>(current.prefill || undefined);
      }
      if (current.mode === "none") {
        return Promise.resolve<string | undefined | null>(current.prefill || undefined);
      }
      const asks = current.mode === "prompt" || current.mode === "lines";
      if (!asks || current.prompts.length === 0) {
        return Promise.resolve<string | undefined | null>(
          current.show ? valueRef.current : undefined,
        );
      }
      return new Promise<string | undefined | null>((resolve) => {
        waiter.current?.(null);
        waiter.current = resolve;
        setConfirmLabel(actionLabel);
        setAnswers(
          current.mode === "lines"
            ? [current.prefill.replace(/\n$/, "")]
            : assignPrefill(current.prefill, current.prompts.length),
        );
        setStep(0);
        setOpen(true);
      });
    },
    [],
  );

  const askLine = useCallback((next: ConsoleQuestion) => {
    return new Promise<string | null>((resolve) => {
      lineWaiter.current?.(null);
      lineWaiter.current = resolve;
      questionValue.current = next.defaultValue;
      setQuestion({
        prompt: next.prompt,
        value: next.defaultValue,
        recent: next.recent,
        number: next.answered + 1,
        canEnd: next.canEnd,
      });
    });
  }, []);

  const consoleLine: ConsoleInputLine | null = question
    ? {
        prompt: question.prompt,
        recent: question.recent,
        number: question.number,
        canEnd: question.canEnd,
        value: question.value,
        onChange: (next) => {
          questionValue.current = next;
          setQuestion((current) => (current ? { ...current, value: next } : current));
        },
        onSubmit: () => answerLine(questionValue.current),
        onEnd: () => answerLine(END_OF_INPUT),
        onCancel: () => answerLine(null),
      }
    : null;

  const currentPrompt = offer.prompts[step];
  const prompt: ProgramInputPrompt | null =
    open && currentPrompt
      ? {
          open: true,
          multiline: offer.mode === "lines",
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
            if (offer.mode === "lines") {
              const text = (answersRef.current[0] ?? "").replace(/\r\n/g, "\n");
              finish(text ? `${text.replace(/\n$/, "")}\n` : "");
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
    askLine,
    consoleLine,
    prompt,
  };
}
