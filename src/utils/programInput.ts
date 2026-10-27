/**
 * Program input for Judge0.
 *
 * A fixed list of reads becomes one submit prompt per value. The answers are
 * stored and sent together, because the runner cannot pause on the input line.
 * A loop or a read that consumes the whole stream keeps the Input box.
 */

export type InputPrompt = {
  /** 1-based line in the source that performs this read. */
  line: number;
  label: string;
  snippet: string;
};

export type InputPlan =
  | { mode: "none" }
  | { mode: "box" }
  | { mode: "prompt"; prompts: InputPrompt[] };

const PREPROCESSOR =
  /^(?:include|define|if|ifdef|ifndef|else|elif|endif|pragma|error|line|undef|region|endregion|warning|nullable)\b/;

/** Same length as `source`. Comments and string contents become spaces. */
export function blankNonCode(source: string): string {
  const chars = source.split("");
  const n = chars.length;
  let i = 0;

  const blank = (from: number, to: number) => {
    for (let k = from; k < to && k < n; k++) {
      if (chars[k] !== "\n") chars[k] = " ";
    }
  };

  while (i < n) {
    const c = chars[i];
    const next = chars[i + 1] ?? "";

    if (c === "/" && next === "/") {
      const start = i;
      i += 2;
      while (i < n && chars[i] !== "\n") i++;
      blank(start, i);
      continue;
    }

    if (c === "/" && next === "*") {
      const start = i;
      i += 2;
      while (i < n && !(chars[i] === "*" && chars[i + 1] === "/")) i++;
      i = Math.min(n, i + 2);
      blank(start, i);
      continue;
    }

    if (
      c === "-" &&
      next === "-" &&
      chars[i + 2] === "[" &&
      chars[i + 3] === "["
    ) {
      const start = i;
      i += 4;
      while (i < n && !(chars[i] === "]" && chars[i + 1] === "]")) i++;
      i = Math.min(n, i + 2);
      blank(start, i);
      continue;
    }

    if (c === "-" && next === "-" && isLuaComment(chars, i)) {
      const start = i;
      i += 2;
      while (i < n && chars[i] !== "\n") i++;
      blank(start, i);
      continue;
    }

    if (c === "#" && isHashComment(chars, i)) {
      const start = i;
      while (i < n && chars[i] !== "\n") i++;
      blank(start, i);
      continue;
    }

    if (c === "'" || c === '"' || c === "`") {
      i = skipString(chars, i);
      continue;
    }

    i++;
  }

  return chars.join("");
}

function isLuaComment(chars: string[], index: number): boolean {
  const prev = index === 0 ? "\n" : chars[index - 1];
  return !/[A-Za-z0-9_]/.test(prev);
}

function isHashComment(chars: string[], index: number): boolean {
  const prev = index === 0 ? "\n" : chars[index - 1];
  if (!/[\n\s;{}]/.test(prev)) return false;
  let end = index + 1;
  while (end < chars.length && chars[end] !== "\n") end++;
  const rest = chars.slice(index + 1, end).join("").trim();
  return !PREPROCESSOR.test(rest);
}

function skipString(chars: string[], index: number): number {
  const quote = chars[index];
  const triple =
    chars[index + 1] === quote && chars[index + 2] === quote && quote !== "`";
  const start = index;
  let i = index + (triple ? 3 : 1);
  let closed = false;

  if (triple) {
    while (i < chars.length) {
      if (
        chars[i] === quote &&
        chars[i + 1] === quote &&
        chars[i + 2] === quote
      ) {
        i += 3;
        closed = true;
        break;
      }
      i++;
    }
  } else {
    while (i < chars.length) {
      if (chars[i] === "\\") {
        i += 2;
        continue;
      }
      if (chars[i] === "\n" && quote !== "`") break;
      if (chars[i] === quote) {
        i++;
        closed = true;
        break;
      }
      i++;
    }
  }

  const contentEnd = closed ? i - (triple ? 3 : 1) : i;
  const contentStart = start + (triple ? 3 : 1);
  for (let k = contentStart; k < contentEnd; k++) {
    if (chars[k] !== "\n") chars[k] = " ";
  }
  return i;
}

type Hit = {
  start: number;
  end: number;
  prompts: number;
  stream: boolean;
  names: string[];
  spoken?: string;
};

export function planProgramReads(code?: string): InputPlan {
  if (!code?.trim()) return { mode: "none" };
  const masked = blankNonCode(code);
  const hits = collectHits(code, masked);
  if (hits.length === 0) return { mode: "none" };

  const prompts: InputPrompt[] = [];
  for (const hit of hits) {
    const { line, text } = lineAt(code, hit.start);
    const snippet = text.trim().replace(/\s+/g, " ");
    const repeats =
      hit.stream ||
      readRepeats(text, hit.stream) ||
      enclosingLoop(masked, hit.start);
    if (repeats) return { mode: "box" };

    const spoken = hit.spoken ?? nearbyPrompt(code, line);
    const labels = labelsFor(hit.prompts, hit.names, spoken);
    for (let i = 0; i < hit.prompts; i++) {
      prompts.push({
        line,
        label: labels[i] ?? "Enter a value",
        snippet: clip(snippet),
      });
    }
  }

  if (prompts.length === 0) return { mode: "none" };
  return { mode: "prompt", prompts };
}

export function programReadsInput(code?: string): boolean {
  return planProgramReads(code).mode !== "none";
}

/** A loop that is supposed to stop when the input ends, not when a guess is right. */
export function readsUntilEnd(code?: string): boolean {
  if (!code?.trim()) return false;
  const masked = blankNonCode(code);
  return (
    /while\s*\(\s*(?:std::)?cin\s*>>/.test(masked) ||
    /while\s*\(\s*(?:std::)?getline\s*\(\s*(?:std::)?cin\b/.test(masked) ||
    /!\s*\(\s*(?:std::)?cin\s*>>/.test(masked) ||
    /if\s*\(\s*!\s*(?:std::)?cin\s*\)/.test(masked) ||
    /\bcin\s*\.\s*eof\s*\(/.test(masked) ||
    /while\s*\(\s*scanf\s*\(/.test(masked) ||
    /\bfor\b[^\n]*\bin\b[^\n]*sys\.stdin/.test(masked) ||
    /sys\.stdin\s*\.\s*(?:read|readlines)\s*\(/.test(masked) ||
    /\bexcept\b[^:\n]*\bEOFError\b/.test(masked)
  );
}

function liveLanguage(language?: string): "python" | "cpp" | null {
  const lang = (language || "").toLowerCase().trim();
  if (lang === "python" || lang === "python3" || lang === "py") return "python";
  if (lang === "cpp" || lang === "c++") return "cpp";
  return null;
}

/**
 * Python `input()` and C++ `std::cin` are answered one at a time in the console.
 * The runner cannot pause a program, so it runs the program again with one
 * more answer each time the program stops to wait (see codeExecution/instrument.ts).
 * Reads that cannot say they ran out of input keep the box or the pop-up.
 */
export function canUseLiveInput(code?: string, language?: string): boolean {
  const lang = liveLanguage(language);
  if (!lang || !code?.trim()) return false;
  if (planProgramReads(code).mode === "none" || readsUntilEnd(code)) return false;
  const masked = blankNonCode(code);
  if (lang === "python") {
    return /\binput\s*\(/.test(masked) && !/\bsys\s*\.\s*stdin\b/.test(masked);
  }
  return (
    /(?:\bstd::|\b)cin\b/.test(masked) &&
    !/\b(?:scanf|fscanf|getchar|fgets|gets|getc|fgetc)\s*\(/.test(masked) &&
    !/sync_with_stdio\s*\(\s*(?:false|0)\s*\)/.test(masked)
  );
}

function collectHits(source: string, masked: string): Hit[] {
  const found: Hit[] = [];
  const hasScanner = /\bScanner\b/.test(masked);
  const hasStdinWord = /\b(?:stdin|STDIN|Stdin|System\.in|process\.stdin)\b/.test(
    source,
  );

  const add = (hit: Hit | null) => {
    if (!hit || hit.end <= hit.start) return;
    found.push(hit);
  };

  for (const match of masked.matchAll(
    /(?:std::)?\bcin\s*(?:>>|\.)/g,
  )) {
    add(parseCin(source, masked, match.index ?? 0));
  }
  for (const match of masked.matchAll(/\bgetline\s*\(\s*(?:std::)?cin\b/g)) {
    add(simpleHit(source, match.index ?? 0, match[0].length, 1));
  }

  for (const match of masked.matchAll(/\bscanf\s*\(/g)) {
    add(parseScanf(source, masked, match.index ?? 0));
  }
  for (const match of masked.matchAll(/\bfscanf\s*\(\s*stdin\b/g)) {
    add(parseScanf(source, masked, match.index ?? 0));
  }

  for (const match of masked.matchAll(/\b(?:fgets|gets|getchar|getc|getline)\s*\(/g)) {
    add(parseCStream(source, masked, match.index ?? 0));
  }

  for (const match of masked.matchAll(/\b(?:input|raw_input)\s*\(/g)) {
    add(parseCallPrompt(source, masked, match.index ?? 0, 1));
  }
  for (const match of masked.matchAll(/sys\.stdin\s*(?:\.|\b)/g)) {
    add(parsePythonStdin(source, masked, match.index ?? 0));
  }

  for (const match of masked.matchAll(
    /\b(?:prompt|readline)\s*(?:<[^>\n]+>)?\s*\(/g,
  )) {
    add(parseCallPrompt(source, masked, match.index ?? 0, 1));
  }
  for (const match of masked.matchAll(/\.question\s*\(/g)) {
    add(parseCallPrompt(source, masked, match.index ?? 0, 1));
  }
  for (const match of masked.matchAll(/\breadLine\s*\(/g)) {
    add(parseCallPrompt(source, masked, match.index ?? 0, 1));
  }
  for (const match of masked.matchAll(/\breadln(?:OrNull)?\s*\(/g)) {
    add(parseCallPrompt(source, masked, match.index ?? 0, 1));
  }

  for (const match of masked.matchAll(
    /\.next(?:Line|Int|Double|Float|Long|Boolean|Short|Byte|BigInteger)\s*\(/g,
  )) {
    add(simpleHit(source, match.index ?? 0, match[0].length, 1));
  }
  if (hasScanner) {
    for (const match of masked.matchAll(/\.next\s*\(/g)) {
      add(simpleHit(source, match.index ?? 0, match[0].length, 1));
    }
  }

  for (const match of masked.matchAll(
    /Console\.Read(?:Line|Key|ToEnd)?\s*\(/g,
  )) {
    const text = match[0];
    add(
      simpleHit(source, match.index ?? 0, text.length, 1, {
        stream: text.includes("ToEnd"),
      }),
    );
  }

  for (const match of masked.matchAll(/\bfmt\.F?Scan(?:f|ln)?\s*\(/g)) {
    add(parseGoScan(source, masked, match.index ?? 0));
  }

  for (const match of masked.matchAll(/\bread_line\s*\(/g)) {
    add(simpleHit(source, match.index ?? 0, match[0].length, 1));
  }
  for (const match of masked.matchAll(/\bread_to_string\s*\(/g)) {
    add(simpleHit(source, match.index ?? 0, match[0].length, 1, { stream: true }));
  }

  for (const match of masked.matchAll(/\bio\.read\s*\(/g)) {
    add(parseLuaRead(source, masked, match.index ?? 0));
  }

  for (const match of masked.matchAll(/\bfgets\s*\(\s*STDIN\b/g)) {
    add(simpleHit(source, match.index ?? 0, match[0].length, 1));
  }
  for (const match of masked.matchAll(/\bfscanf\s*\(\s*STDIN\b/g)) {
    add(parseScanf(source, masked, match.index ?? 0));
  }
  for (const match of masked.matchAll(/\bstream_get_line\s*\(\s*STDIN\b/g)) {
    add(simpleHit(source, match.index ?? 0, match[0].length, 1));
  }
  for (const match of masked.matchAll(/\bfile_get_contents\s*\(/g)) {
    add(parsePhpStdin(source, masked, match.index ?? 0));
  }

  for (const match of masked.matchAll(/\bSTDIN\.gets\b|\bgets\b/g)) {
    add(parseRubyGets(source, masked, match.index ?? 0));
  }
  for (const match of masked.matchAll(/\breadlines\b/g)) {
    add(simpleHit(source, match.index ?? 0, match[0].length, 1, { stream: true }));
  }

  for (const match of masked.matchAll(/<\s*STDIN\s*>/g)) {
    add(simpleHit(source, match.index ?? 0, match[0].length, 1));
  }

  for (const match of masked.matchAll(
    /stdin\.read(?:LineSync|ByteSync|StringSync)\s*\(/g,
  )) {
    const stream = match[0].includes("StringSync");
    add(simpleHit(source, match.index ?? 0, match[0].length, 1, { stream }));
  }

  for (const match of masked.matchAll(
    /(?:^|[;\n|&])[ \t]*read\b/g,
  )) {
    add(parseBashRead(source, masked, match.index ?? 0));
  }
  for (const match of masked.matchAll(/\b(?:mapfile|readarray)\b/g)) {
    add(simpleHit(source, match.index ?? 0, match[0].length, 1, { stream: true }));
  }

  for (const match of masked.matchAll(/\bfs\.readFileSync\s*\(/g)) {
    add(parseNodeStdin(source, masked, match.index ?? 0));
  }
  for (const match of masked.matchAll(/\bprocess\.stdin\b/g)) {
    add(parseProcessStdin(source, masked, match.index ?? 0));
  }

  if (hasStdinWord && found.length === 0) {
    const index = source.search(/\b(?:stdin|STDIN|Stdin|System\.in|process\.stdin)\b/);
    if (index >= 0) {
      add(simpleHit(source, index, 5, 1, { stream: true }));
    }
  }

  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Hit[] = [];
  let end = -1;
  for (const hit of found) {
    if (hit.start < end) continue;
    kept.push(hit);
    end = hit.end;
  }
  return kept;
}

function parseCin(source: string, masked: string, index: number): Hit | null {
  const slice = masked.slice(index);
  const arrow = slice.match(/^(?:std::)?cin((?:\s*>>\s*[A-Za-z_][\w:.]*)+)/);
  if (arrow) {
    const names = [...arrow[1].matchAll(/>>\s*([A-Za-z_][\w:.]*)/g)]
      .map((item) => item[1])
      .filter((name) => name !== "ws");
    return simpleHit(source, index, arrow[0].length, Math.max(names.length, 1), {
      names,
    });
  }
  const method = slice.match(/^(?:std::)?cin\s*\.\s*(?:get|getline|read|ignore)\s*\(/);
  if (method) {
    return simpleHit(source, index, method[0].length, 1);
  }
  const getline = masked.slice(0, index).match(/getline\s*\(\s*$/);
  if (getline) {
    return simpleHit(source, index - getline[0].length, getline[0].length + 3, 1);
  }
  return simpleHit(source, index, slice.match(/^(?:std::)?cin/)?.[0].length ?? 3, 1);
}

function parseScanf(source: string, masked: string, index: number): Hit | null {
  const paren = masked.indexOf("(", index);
  if (paren < 0) return null;
  const call = callBody(masked, paren);
  const original = source.slice(paren, paren + call.length);
  const format = original.match(/"((?:\\.|[^"\\])*)"/)?.[1] ?? "";
  const count = Math.max(formatSpecifierCount(format), 1);
  const start = index;
  return simpleHit(source, start, paren + call.length - start, count, {
    stream: false,
  });
}

function parseCStream(source: string, masked: string, index: number): Hit | null {
  const name = masked.slice(index).match(/^(fgets|gets|getchar|getc|getline)/)?.[1];
  if (!name) return null;
  const paren = masked.indexOf("(", index);
  if (paren < 0) return null;
  const call = source.slice(paren, paren + callBody(masked, paren).length);
  const length = paren + call.length - index;
  if (name === "gets" || name === "getchar") {
    return simpleHit(source, index, length, 1);
  }
  if (!/\bstdin\b/i.test(call)) return null;
  return simpleHit(source, index, length, 1);
}

function parseCallPrompt(
  source: string,
  masked: string,
  index: number,
  count: number,
): Hit | null {
  const paren = masked.indexOf("(", index);
  if (paren < 0) return null;
  const call = source.slice(index, paren + callBody(masked, paren).length);
  const spoken = firstString(call);
  return simpleHit(source, index, call.length, count, { spoken });
}

function parsePythonStdin(source: string, masked: string, index: number): Hit | null {
  const slice = masked.slice(index);
  if (/^sys\.stdin\s*\.\s*readline\s*\(/.test(slice)) {
    const paren = masked.indexOf("(", index);
    const call = callBody(masked, paren);
    return simpleHit(source, index, paren + call.length - index, 1);
  }
  if (/^sys\.stdin\s*\.\s*readlines\s*\(/.test(slice) || /^sys\.stdin\s*\.\s*read\s*\(/.test(slice)) {
    const paren = masked.indexOf("(", index);
    const call = callBody(masked, paren);
    return simpleHit(source, index, paren + call.length - index, 1, { stream: true });
  }
  return simpleHit(source, index, "sys.stdin".length, 1, { stream: true });
}

function parseGoScan(source: string, masked: string, index: number): Hit | null {
  const paren = masked.indexOf("(", index);
  if (paren < 0) return null;
  const call = source.slice(index, paren + callBody(masked, paren).length);
  const isPrintf = /Scanf\s*\(/.test(call);
  const amps = call.match(/&/g)?.length ?? 1;
  const count = isPrintf
    ? Math.max(formatSpecifierCount(firstString(call) ?? ""), 1)
    : Math.max(amps, 1);
  return simpleHit(source, index, call.length, count);
}

function parseLuaRead(source: string, masked: string, index: number): Hit | null {
  const paren = masked.indexOf("(", index);
  if (paren < 0) return null;
  const call = source.slice(index, paren + callBody(masked, paren).length);
  if (/\*\s*a(?:ll)?\b/.test(call)) {
    return simpleHit(source, index, call.length, 1, { stream: true });
  }
  const specs = call.match(/\*\s*(?:n(?:umber)?|l(?:ine)?)/g);
  const quoted = [...call.matchAll(/"([^"]*)"|'([^']*)'/g)].length;
  const count = Math.max(specs?.length ?? 0, quoted > 0 && !specs ? quoted : 0, 1);
  return simpleHit(source, index, call.length, count);
}

function parsePhpStdin(source: string, masked: string, index: number): Hit | null {
  const paren = masked.indexOf("(", index);
  if (paren < 0) return null;
  const call = source.slice(paren, paren + callBody(masked, paren).length);
  if (!/php:\/\/stdin/i.test(call)) return null;
  return simpleHit(source, index, paren + call.length - index, 1, { stream: true });
}

function parseRubyGets(source: string, masked: string, index: number): Hit | null {
  const slice = masked.slice(index);
  if (/^STDIN\.gets/.test(slice)) {
    return simpleHit(source, index, "STDIN.gets".length, 1);
  }
  if (!/^gets\b/.test(slice)) return null;
  if (/^gets\s*=/.test(slice)) return null;
  const end = index + (slice.match(/^gets(?:\s*\([^)]*\))?/)?.[0].length ?? 4);
  return simpleHit(source, index, end - index, 1);
}

function parseBashRead(source: string, masked: string, index: number): Hit | null {
  const lineStart = masked.lastIndexOf("\n", index) + 1;
  const line = source.slice(lineStart).split("\n")[0] ?? "";
  if (!/(?:^|[;&|])\s*read\b/.test(line)) return null;
  if (/\bread(?:only)?\s*[=(]/.test(line)) return null;
  if (/\breadonly\b/.test(line)) return null;
  const spoken = line.match(/\bread\s+-p\s*(["'])((?:\\.|(?!\1).)*)\1/)?.[2];
  const readIndex = line.search(/\bread\b/);
  const start = lineStart + Math.max(readIndex, 0);
  return simpleHit(source, start, 4, 1, {
    spoken: spoken ? decodeString(spoken) : undefined,
  });
}

function parseNodeStdin(source: string, masked: string, index: number): Hit | null {
  const paren = masked.indexOf("(", index);
  if (paren < 0) return null;
  const call = source.slice(paren, paren + callBody(masked, paren).length);
  if (!/\/dev\/stdin|\b0\b/.test(call)) return null;
  return simpleHit(source, index, paren + call.length - index, 1, { stream: true });
}

function parseProcessStdin(source: string, masked: string, index: number): Hit | null {
  if (/\b(?:readline|prompt|question)\s*\(/.test(masked)) return null;
  return simpleHit(source, index, "process.stdin".length, 1, { stream: true });
}

function simpleHit(
  _source: string,
  start: number,
  length: number,
  prompts: number,
  extra?: { stream?: boolean; names?: string[]; spoken?: string },
): Hit {
  return {
    start,
    end: start + length,
    prompts: extra?.stream ? 0 : prompts,
    stream: extra?.stream ?? false,
    names: extra?.names ?? [],
    spoken: extra?.spoken,
  };
}

function callBody(masked: string, openParen: number): string {
  let depth = 0;
  for (let i = openParen; i < masked.length; i++) {
    const ch = masked[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return masked.slice(openParen, i + 1);
    }
  }
  return masked.slice(openParen);
}

function formatSpecifierCount(format: string): number {
  const specs = format.matchAll(
    /%(?:%|[-+0# ]*\*?(?:\d+)?(?:\.\d+)?(?:hh|h|ll|l|j|z|t|L)?([diuoxXfFeEgGaAcspn]))/g,
  );
  let count = 0;
  for (const spec of specs) {
    if (spec[0] === "%%" || spec[1] === "n") continue;
    count++;
  }
  return count;
}

function firstString(text: string): string | undefined {
  const match = text.match(/"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'/);
  const raw = match?.[1] ?? match?.[2];
  if (!raw?.trim()) return undefined;
  return decodeString(raw);
}

function decodeString(raw: string): string {
  return raw
    .replace(/\\n/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .trim();
}

function nearbyPrompt(source: string, line: number): string | undefined {
  const lines = source.split("\n");
  for (let i = line - 2; i >= Math.max(0, line - 5); i--) {
    const text = lines[i] ?? "";
    if (
      !/(cout|printf|println|puts\b|echo\b|Console\.Write|fmt\.Print|System\.out|putStr|console\.log|print\b|say\b)/.test(
        text,
      )
    ) {
      continue;
    }
    const spoken = lastString(text);
    if (spoken) return spoken;
  }
  return undefined;
}

function lastString(text: string): string | undefined {
  const matches = [
    ...text.matchAll(/"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'/g),
  ];
  if (matches.length === 0) return undefined;
  const last = matches[matches.length - 1];
  const raw = last[1] ?? last[2];
  if (!raw?.trim()) return undefined;
  return decodeString(raw);
}

function labelsFor(count: number, names: string[], spoken?: string): string[] {
  return Array.from({ length: count }, (_, index) => {
    if (index === 0 && spoken) return spoken;
    const name = names[index];
    if (name && name !== "ws") return `Enter ${name.replace(/^std::/, "")}`;
    if (spoken && count > 1) return `${spoken} (${index + 1})`;
    return count === 1 ? "Enter a value" : `Enter value ${index + 1}`;
  });
}

function readRepeats(line: string, stream: boolean): boolean {
  if (/\bwhile\b|\buntil\b/.test(line)) return true;
  if (stream && /\bfor\b/.test(line)) return true;
  return false;
}

function enclosingLoop(masked: string, index: number): boolean {
  const before = masked.slice(0, index);
  const lines = before.split("\n");
  const current = lines.pop() ?? "";
  let depth = 0;
  const frames: Array<{ kind: "brace" | "indent"; indent: number; depth: number }> = [];

  const pushBody = (line: string, indent: number) => {
    if (!isLoopHeader(line)) return;
    const opens = (line.match(/\{/g) ?? []).length;
    if (opens > 0) return;
    frames.push({ kind: "indent", indent, depth });
  };

  for (const line of lines) {
    const indent = leadingIndent(line);
    const opensBrace = line.trimStart().startsWith("{");
    if (opensBrace && frames[frames.length - 1]?.kind === "indent") {
      const top = frames.pop();
      let lineDepth = depth;
      for (const ch of line) {
        if (ch === "{") {
          lineDepth++;
          if (lineDepth === depth + 1) {
            frames.push({ kind: "brace", indent: top?.indent ?? indent, depth: lineDepth });
          }
        } else if (ch === "}") {
          closeBrace(frames, lineDepth);
          lineDepth = Math.max(0, lineDepth - 1);
        }
      }
      depth = lineDepth;
      continue;
    }

    while (
      frames.length > 0 &&
      frames[frames.length - 1].kind === "indent" &&
      indent <= frames[frames.length - 1].indent
    ) {
      frames.pop();
    }

    let openedForHeader = false;
    let lineDepth = depth;
    const header = isLoopHeader(line);
    for (const ch of line) {
      if (ch === "{") {
        lineDepth++;
        if (header && !openedForHeader) {
          frames.push({ kind: "brace", indent, depth: lineDepth });
          openedForHeader = true;
        }
      } else if (ch === "}") {
        closeBrace(frames, lineDepth);
        lineDepth = Math.max(0, lineDepth - 1);
      }
    }
    depth = lineDepth;
    if (header && !openedForHeader) pushBody(line, indent);
    if (/^\s*(?:end|done)\b/.test(line)) popIndent(frames);
  }

  const currentIndent = leadingIndent(current);
  while (
    frames.length > 0 &&
    frames[frames.length - 1].kind === "indent" &&
    currentIndent <= frames[frames.length - 1].indent
  ) {
    frames.pop();
  }
  return frames.length > 0;
}

function isLoopHeader(line: string): boolean {
  return /\b(?:while|foreach|until)\b|\bfor\b|\bloop\b|\.forEach\b|\.each\b|\.times\b|\.eachLine\b|\bdo\s*\{/.test(
    line,
  );
}

function leadingIndent(line: string): number {
  return line.match(/^[ \t]*/)?.[0].length ?? 0;
}

function closeBrace(
  frames: Array<{ kind: "brace" | "indent"; indent: number; depth: number }>,
  depth: number,
) {
  const top = frames[frames.length - 1];
  if (top?.kind === "brace" && top.depth === depth) frames.pop();
}

function popIndent(
  frames: Array<{ kind: "brace" | "indent"; indent: number; depth: number }>,
) {
  for (let i = frames.length - 1; i >= 0; i--) {
    if (frames[i].kind === "indent") {
      frames.splice(i, 1);
      return;
    }
  }
}

function lineAt(source: string, index: number): { line: number; text: string } {
  const line = source.slice(0, index).split("\n").length;
  return { line, text: source.split("\n")[line - 1] ?? "" };
}

function clip(text: string): string {
  if (text.length <= 88) return text;
  return `${text.slice(0, 85)}...`;
}

export type ProgramInputSeed = {
  /** Changes when the lesson moves to another example or question. */
  key: string;
  exampleStdin?: string;
  questionStdin?: string;
  exampleCode?: string;
  editorCode?: string;
  /** Python and C++ answer their reads in the console when the source allows it. */
  language?: string;
};

export function programInputState(seed: ProgramInputSeed): {
  show: boolean;
  prefill: string;
  mode: InputPlan["mode"] | "live";
  prompts: InputPrompt[];
  /** Loop reads use the box. A preset is only a fallback when a read was not recognised. */
  hint: "loop" | "preset" | null;
} {
  const hasQuestion = typeof seed.questionStdin === "string";
  const hasExample = typeof seed.exampleStdin === "string";
  const prefill = hasQuestion
    ? seed.questionStdin ?? ""
    : hasExample
      ? seed.exampleStdin ?? ""
      : "";
  const source = seed.editorCode ?? seed.exampleCode ?? "";
  if (canUseLiveInput(source, seed.language)) {
    return { show: false, prefill, mode: "live", prompts: [], hint: null };
  }
  const plan = planProgramReads(source);
  if (plan.mode === "prompt") {
    return { show: false, prefill, mode: "prompt", prompts: plan.prompts, hint: null };
  }
  if (plan.mode === "box") {
    return { show: true, prefill, mode: "box", prompts: [], hint: "loop" };
  }
  if ((hasQuestion || hasExample) && source.trim()) {
    return { show: true, prefill, mode: "box", prompts: [], hint: "preset" };
  }
  return { show: false, prefill, mode: "none", prompts: [], hint: null };
}

/** Split authored stdin across a fixed number of prompts. */
export function assignPrefill(prefill: string, count: number): string[] {
  if (count <= 0) return [];
  if (!prefill) return Array.from({ length: count }, () => "");
  if (prefill.includes("\n")) {
    const lines = prefill.split("\n");
    return Array.from({ length: count }, (_, index) => lines[index] ?? "");
  }
  if (count === 1) return [prefill];
  const parts = prefill.trim().split(/\s+/).filter((part) => part.length > 0);
  if (parts.length === 0) return Array.from({ length: count }, () => "");
  if (parts.length >= count) {
    return [
      ...parts.slice(0, count - 1),
      parts.slice(count - 1).join(" "),
    ];
  }
  return Array.from({ length: count }, (_, index) => parts[index] ?? "");
}

export function joinPromptAnswers(answers: string[]): string {
  if (answers.length === 0) return "";
  return `${answers.join("\n")}\n`;
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
