/**
 * Optional program input for Judge0.
 * A lesson can set `stdin` in JSON. Programs that read input also show the box
 * even when that field was left out.
 */

const INPUT_READ: RegExp[] = [
  /\bstd::cin\b/,
  /(^|[^\w:])cin\s*>>/,
  /\bscanf\s*\(/,
  /\bfgets\s*\(/,
  /\bgets\s*\(/,
  /\binput\s*\(/,
  /\bSystem\.in\b/,
  /\bnew\s+Scanner\b/,
  /\bConsole\.Read(?:Line|Key)?\s*\(/,
  /\bfmt\.Scan/,
  /\bos\.Stdin\b/,
  /\bstdin\s*\(\s*\)/,
  /\bread(?:Line|ln|line)\s*\(/,
  /\bSTDIN\b/,
  /\bio\.read\s*\(/,
  /\b(?:readline|prompt)\s*\(/,
];

export function programReadsInput(code?: string): boolean {
  if (!code?.trim()) return false;
  return INPUT_READ.some((pattern) => pattern.test(code));
}

export type ProgramInputSeed = {
  /** Changes when the lesson moves to another example or question. */
  key: string;
  exampleStdin?: string;
  questionStdin?: string;
  exampleCode?: string;
  editorCode?: string;
};

export function programInputState(seed: ProgramInputSeed): {
  show: boolean;
  prefill: string;
} {
  const hasQuestion = typeof seed.questionStdin === "string";
  const hasExample = typeof seed.exampleStdin === "string";
  const prefill = hasQuestion
    ? seed.questionStdin ?? ""
    : hasExample
      ? seed.exampleStdin ?? ""
      : "";
  const show =
    hasQuestion ||
    hasExample ||
    programReadsInput(seed.exampleCode) ||
    programReadsInput(seed.editorCode);
  return { show, prefill };
}

/** Input sent with an example run. Undefined when the program does not read any. */
export function stdinForRun(
  source?: { stdin?: string; code?: string } | null,
  questionStdin?: string,
): string | undefined {
  if (typeof questionStdin === "string") return questionStdin;
  if (typeof source?.stdin === "string") return source.stdin;
  if (programReadsInput(source?.code)) return "";
  return undefined;
}
