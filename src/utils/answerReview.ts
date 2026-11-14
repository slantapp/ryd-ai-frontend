/**
 * "View correct answer" after a code question's tries are used up.
 *
 * Curriculum JSON convention (HTML Step 8 and siblings):
 * - `code_example.code` / `.html` / `.css`  → teach DEMO (often a different theme)
 * - `code_example.starterCode` / starters   → practice skeleton the learner edits
 * - `testCriteria.expectedCode`            → grader (often `regex:…`, never show raw)
 * - `testCriteria.expectedHTML|CSS|JS`     → plain pane answers when authored
 *
 * The compare modal must show a practice solution that passes the grader —
 * never the teach demo when it fails the check, and never regex debris.
 */
import { isRegexExpectedCode, matchExpectedCode } from "./codeTestValidation";
import type { WebCodeSources } from "./webCodeWorkspace";

export type AnswerReviewQuestion = {
  type: string;
  code_example?: {
    code?: string;
    html?: string;
    css?: string;
    language?: string;
    runtime?: string;
    /** Practice skeleton the learner edits — preferred over the demo `code` for reviews. */
    starterCode?: string;
    starterHtml?: string;
    starterCss?: string;
  };
  testCriteria?: {
    expectedCode?: string;
    expectedHTML?: string;
    expectedCSS?: string;
    expectedJS?: string;
    /** Style / DOM checks — used to fill concrete CSS values when expectedCode is a regex. */
    domChecks?: Array<Record<string, unknown>>;
  };
};

export type AnswerReview = {
  /** Monaco / editor language of the main answer (python, html, css, javascript…). */
  language: string;
  /** The learner's last submission and the stored answer: one file, or HTML/CSS/JavaScript. */
  learner: { code: string } | { web: WebCodeSources };
  answer: { code: string } | { web: WebCodeSources };
};

/** Spoken by the tutor once the tries are used up and an answer is stored. */
export const ANSWER_REVIEW_SPEECH =
  "Tap View correct answer to see it next to your code. Compare them, then tap Continue when you are ready.";

/** Last console line in the same moment. */
export const ANSWER_REVIEW_CONSOLE_HINT =
  "💡 Tap “View correct answer” to compare it with your code, then tap Continue.";

const text = (value?: string) => (typeof value === "string" ? value.trim() : "");

const HASH_COMMENT_LANGUAGES = new Set(["python", "ruby", "bash", "perl"]);

const C_STYLE_COMMENT_LANGUAGES = new Set([
  "css",
  "javascript",
  "js",
  "typescript",
  "ts",
  "java",
  "c",
  "cpp",
  "c++",
  "csharp",
  "c#",
  "go",
  "rust",
  "kotlin",
  "php",
  "swift",
  "scala",
  "dart",
]);

/** Which web pane holds the lesson's main answer (matches course language). */
export function webAnswerPane(language?: string): keyof WebCodeSources {
  const lang = (language || "").toLowerCase().trim();
  if (lang === "css") return "css";
  if (lang === "javascript" || lang === "js") return "javascript";
  return "html";
}

/** Drop HTML comments (practice TODOs) so the review shows a finished page. */
export function stripHtmlComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Strip practice TODO comments for the course language before matching / display. */
export function stripPracticeComments(source: string, language?: string): string {
  const lang = (language || "").toLowerCase().trim();
  let out = source;
  if (lang === "html" || lang === "web" || lang.startsWith("html")) {
    out = stripHtmlComments(out);
  }
  if (C_STYLE_COMMENT_LANGUAGES.has(lang) || lang === "css") {
    out = out
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
  }
  if (HASH_COMMENT_LANGUAGES.has(lang)) {
    out = out.replace(/^[ \t]*#.*$/gm, "");
  }
  if (lang === "lua") {
    out = out.replace(/^[ \t]*--.*$/gm, "");
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * True when a candidate string still looks like regex machinery — never show these
 * in the compare modal.
 */
export function looksLikeRegexDebris(sample: string): boolean {
  const s = text(sample);
  if (!s) return true;
  if (/^regex:/i.test(s)) return true;
  if (/\(\?:/.test(s)) return true;
  if (/\[\^/.test(s)) return true;
  if (/\[\\[sSwWdD]/.test(s) || /\\[sSwWdD]/.test(s)) return true;
  if (/\[[\w.#:\-^=|]+\]/.test(s)) return true;
  if (/\{[=:|^]/.test(s)) return true;
  if (/\[\s*\\w/.test(s)) return true;
  if (/<!\[/.test(s)) return true;
  if (/\|\)/.test(s) && /[\[\]*+]/.test(s)) return true;
  // Lots of regex metacharacters relative to length → mangled sample.
  const noise = (s.match(/[\[\]|*+?^$\\]/g) || []).length;
  if (noise >= 4 && noise / Math.max(s.length, 1) > 0.12) return true;
  return false;
}

/** True when the string is safe to show learners as source code. */
export function looksLikeReadableSource(sample: string): boolean {
  const s = text(sample);
  if (!s) return false;
  return !looksLikeRegexDebris(s);
}

function withRegexPrefix(expectedCode: string): string {
  const raw = text(expectedCode);
  return raw.startsWith("regex:") ? raw : `regex:${raw}`;
}

/** Prefer a candidate only when it is readable source (never regex debris). */
function safeSource(sample: string): string {
  return looksLikeReadableSource(sample) ? text(sample) : "";
}

/** Map a DOM style check name to a CSS property. */
export function styleCheckToCssProp(style: string): string {
  const map: Record<string, string> = {
    color: "color",
    backgroundColor: "background-color",
    borderTopColor: "border-color",
    borderBottomColor: "border-color",
    borderLeftColor: "border-color",
    borderRightColor: "border-color",
    borderColor: "border-color",
    fontSize: "font-size",
    fontWeight: "font-weight",
  };
  if (map[style]) return map[style];
  return style.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Build CSS rules from curriculum `domChecks` style assertions.
 * Skips `:not(...)` baseline checks that only confirm the starter is unchanged.
 */
export function cssFromDomChecks(
  domChecks?: Array<Record<string, unknown>>,
): string {
  if (!domChecks?.length) return "";
  const rules = new Map<string, Map<string, string>>();

  for (const check of domChecks) {
    const style = typeof check.style === "string" ? check.style : "";
    const equals = typeof check.equals === "string" ? check.equals.trim() : "";
    const selector = typeof check.selector === "string" ? check.selector.trim() : "";
    if (!style || !equals || !selector) continue;
    if (/:not\s*\(/i.test(selector)) continue;

    // Prefer the right-most class — `.profile .profile__name` → `.profile__name`
    const classes = selector.match(/\.[a-zA-Z_][\w-]*/g);
    if (!classes?.length) continue;
    const sel = classes[classes.length - 1];
    const prop = styleCheckToCssProp(style);

    if (!rules.has(sel)) rules.set(sel, new Map());
    rules.get(sel)!.set(prop, equals);
  }

  if (!rules.size) return "";
  return [...rules.entries()]
    .map(([sel, decls]) => {
      const body = [...decls.entries()].map(([p, v]) => `  ${p}: ${v};`).join("\n");
      return `${sel} {\n${body}\n}`;
    })
    .join("\n\n");
}

/**
 * Extract `.selector { prop: … }` shapes from CSS grading regexes, including
 * lookahead forms like `\.profile__name\s*\{(?=...color\s*:)`.
 * Values may be missing — callers fill them from TODOs / domChecks.
 */
export function cssRuleShapesFromRegex(expectedCode: string): Array<{
  selector: string;
  prop: string;
  value?: string;
}> {
  const raw = text(expectedCode);
  const pattern = raw.startsWith("regex:") ? raw.slice("regex:".length) : raw;
  const shapes: Array<{ selector: string; prop: string; value?: string }> = [];

  // Lookahead form: \.name\s*\{(?=...prop\s*:\s*(?:literal|[^...]))
  const lookahead = pattern.matchAll(
    /\.([\w-]+)\\s\*\\\{(?:\(\?\=)?(?:[^)]*?)\b([a-z-]+)\\s\*:\\s\*(?:([^\[\\|+*?{()]+)|)/gi,
  );
  for (const m of lookahead) {
    const selector = `.${m[1]}`;
    const prop = m[2];
    const value = m[3]?.replace(/\\/g, "").trim();
    if (prop && !shapes.some((s) => s.selector === selector && s.prop === prop)) {
      shapes.push({
        selector,
        prop,
        value: value && /^[a-z0-9#%()._-]+$/i.test(value) ? value : undefined,
      });
    }
  }

  // Simple form: \.name\s*\{\s*prop\s*:\s*value
  if (!shapes.length) {
    for (const m of pattern.matchAll(
      /\.([\w-]+)(?:\\s\*|\\s\+|\s)*\\?\{(?:\\s\*|\\s\+|\s)*([a-z-]+)(?:\\s\*|\\s\+|\s)*:(?:\\s\*|\\s\+|\s)*([a-z0-9#%()._-]+)/gi,
    )) {
      shapes.push({ selector: `.${m[1]}`, prop: m[2], value: m[3] });
    }
  }

  return shapes;
}

/** Build readable CSS from a grading regex + optional value hints (TODO / domChecks). */
export function cssSampleFromExpectedRegex(
  expectedCode: string,
  valueHints: Array<{ selector: string; prop: string; value: string }> = [],
): string {
  const shapes = cssRuleShapesFromRegex(expectedCode);
  if (!shapes.length) return "";

  const hintMap = new Map(
    valueHints.map((h) => [`${h.selector}::${h.prop}`, h.value] as const),
  );

  const rules = new Map<string, Map<string, string>>();
  for (const shape of shapes) {
    const value =
      shape.value ||
      hintMap.get(`${shape.selector}::${shape.prop}`) ||
      [...hintMap.entries()].find(([k]) => k.startsWith(`${shape.selector}::`))?.[1];
    if (!value) continue;
    if (!rules.has(shape.selector)) rules.set(shape.selector, new Map());
    rules.get(shape.selector)!.set(shape.prop, value);
  }
  if (!rules.size) return "";
  return [...rules.entries()]
    .map(([sel, decls]) => {
      const body = [...decls.entries()].map(([p, v]) => `  ${p}: ${v};`).join("\n");
      return `${sel} {\n${body}\n}`;
    })
    .join("\n\n");
}

/**
 * Turn a CSS `/* TODO … *​/` hint into a rule.
 * e.g. "make every profile__name navy" → `.profile__name { color: navy; }`
 */
export function cssFromTodoHint(hint: string): string {
  const h = hint.replace(/\s+/g, " ").trim();
  if (!h) return "";

  const className =
    h.match(/\b([\w-]+__[\w-]+)\b/)?.[1] ||
    h.match(/\b([\w-]+--[\w-]+)\b/)?.[1] ||
    h.match(/\b([a-z][\w-]*(?:__|--)[\w-]+)\b/i)?.[1] ||
    "";
  if (!className) return "";

  const colour =
    h.match(
      /\b(navy|limegreen|seagreen|forestgreen|dodgerblue|coral|gold|crimson|tomato|orange|purple|pink|brown|black|white|gray|grey|red|blue|green|yellow|#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\b/i,
    )?.[1] || "";
  if (!colour) return "";

  const prop = /\bborder\b/i.test(h) ? "border-color" : "color";
  return `.${className} {\n  ${prop}: ${colour};\n}`;
}

/**
 * Turn a grading `regex:…` pattern into a short readable sample (not for matching).
 * HTML layout tags and CSS `prop: value` checks are the common curriculum shapes.
 */
export function sampleFromExpectedRegex(expectedCode: string): string {
  const raw = text(expectedCode);
  if (!raw.startsWith("regex:") && !isRegexExpectedCode(raw)) {
    return safeSource(raw);
  }
  let pattern = raw.startsWith("regex:") ? raw.slice("regex:".length) : raw;

  // --- CSS BEM / lookahead rules (profile__name, card--featured, …) ---
  const bemCss = cssSampleFromExpectedRegex(raw);
  if (bemCss && looksLikeReadableSource(bemCss)) return bemCss;

  // --- CSS: build a tiny rule from selector + declarations before the generic scrub ---
  const cssDecls = Array.from(
    pattern.matchAll(/([a-z-]+)\\s\*:\\s\*([a-z0-9#%()._-]+)/gi),
  ).map((m) => `${m[1]}: ${m[2]};`);
  if (!cssDecls.length) {
    // Unescaped forms: color\s*:\s*green or color:green inside character classes.
    const loose = Array.from(
      pattern.matchAll(/(?:^|[^a-z-])([a-z-]{2,})(?:\\s\*|\\s\+|\s)*:(?:\\s\*|\\s\+|\s)*([a-z0-9#%()._-]+)/gi),
    ).map((m) => `${m[1]}: ${m[2]};`);
    cssDecls.push(...loose);
  }
  const cssSelector =
    pattern.match(
      /(?:^|[^\w-])((?:[#.][\w-]+)|(?:\b(?:h[1-6]|p|div|span|body|html|a|img|ul|li|button|nav|header|footer|main|section|article|aside)\b))(?:\\s\*|\\s\+|[\w.#:\\s-]*)*\\?\{/i,
    )?.[1] ??
    pattern.match(
      /(?:^|[^\w-])((?:[#.][\w-]+)|(?:\b(?:h[1-6]|p|div|span|body|html|a|img|ul|li|button|nav|header|footer|main|section|article|aside)\b))\s*\{/i,
    )?.[1] ??
    "";

  if (cssDecls.length && (/\\?\{/.test(pattern) || cssSelector)) {
    const selector = cssSelector || "p";
    const built = `${selector} {\n  ${[...new Set(cssDecls)].join("\n  ")}\n}`;
    if (looksLikeReadableSource(built)) return built;
  }

  // --- HTML / generic: scrub regex noise into approximate source ---
  pattern = pattern
    .replace(/\(\?:<!--\[\\s\\S\]\*\?-->\\s\*\)\*/g, "")
    .replace(/\(\?:\\s\[\^>\]\*\)\?/g, "")
    .replace(/\[\^>\]\*/g, "")
    .replace(/\[\^<\]\*/g, "")
    .replace(/\[\^}\]\*/g, "")
    .replace(/\[\^;\\|\\n\]\*/g, "")
    .replace(/\[\^;|\n\]\*/g, "")
    .replace(/\[\\s\\S\]\*\?/g, "")
    .replace(/\[\\s\\S\]\*/g, "")
    .replace(/\\s\+/g, " ")
    .replace(/\\s\*/g, "")
    .replace(/\\s/g, " ")
    .replace(/\\\//g, "/")
    .replace(/\\\./g, ".")
    .replace(/\\([.()[\]{}|+?])/g, "$1")
    .replace(/[()?]/g, "")
    .replace(/ {2,}/g, " ")
    .trim();

  // Light pretty-print for nested tags: <footer><p>…</p></footer>
  pattern = pattern.replace(/><(?!\/)/g, ">\n  <").replace(/><\/(\w+)/g, ">\n</$1");

  // Drop leading/trailing context anchors left by lookbehind-style checks
  // (e.g. `</section>\n<section>…</section>\n</main>` → just the new section).
  pattern = pattern
    .replace(/^(?:\s*<\/[a-zA-Z][^>]*>)+/, "")
    .replace(/(?:\s*<\/(?:main|body|html)\s*>)+\s*$/i, "")
    .trim();

  if (looksLikeReadableSource(pattern)) return pattern.trim();

  // CSS fallback when the scrub failed but we still extracted declarations.
  if (cssDecls.length) {
    const selector = cssSelector || "p";
    const built = `${selector} {\n  ${[...new Set(cssDecls)].join("\n  ")}\n}`;
    if (looksLikeReadableSource(built)) return built;
  }

  return "";
}

function passesExpected(code: string, expected: string, language: string): boolean {
  if (!expected) return Boolean(text(code));
  try {
    return matchExpectedCode(code, expected, language);
  } catch {
    return false;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build markup from an authored HTML TODO hint when the regex sample is thin.
 * Covers the common Step curriculum shapes (header/footer/section/aside/…).
 */
export function htmlFromTodoHint(hint: string): string {
  const h = hint.replace(/\s+/g, " ").trim();
  if (!h) return "";

  const tidy = (value: string) => value.replace(/[.,;:]+$/, "").trim();

  const headerH1 =
    h.match(/\bheader\b.*?\bh1\b\s*[:—–-]\s*(.+)$/i) ||
    h.match(/\bh1\b\s*[:—–-]\s*(.+)$/i);
  if (/\bheader\b/i.test(h) && headerH1) {
    return `<header>\n  <h1>${tidy(headerH1[1])}</h1>\n</header>`;
  }

  const footerSays =
    h.match(/\bfooter\b.*?\b(?:paragraph|p)\b\s*[:—–-]\s*(.+)$/i) ||
    h.match(/\bfooter\b.*?\bsays\s+(.+)$/i) ||
    h.match(/\bparagraph\s+that\s+says\s+(.+)$/i);
  if (/\bfooter\b/i.test(h) && footerSays) {
    return `<footer>\n  <p>${tidy(footerSays[1])}</p>\n</footer>`;
  }

  // "a main with one section: an h2 Drawing and a paragraph about drawing"
  if (/\bmain\b/i.test(h) && /\bsection\b/i.test(h) && /\bh2\b/i.test(h)) {
    const title = h.match(/\bh2\b\s+(.+?)(?:\s+and\b|\s*$)/i)?.[1];
    const about = h.match(/\bparagraph\s+about\s+(.+)$/i)?.[1];
    const body = h.match(/\bparagraph\s*[:—–-]\s*(.+)$/i)?.[1];
    if (title) {
      const h2 = tidy(title);
      const p = tidy(body || (about ? `I like ${about}` : `I like ${h2}.`));
      return `<main>\n  <section>\n    <h2>${h2}</h2>\n    <p>${p}</p>\n  </section>\n</main>`;
    }
  }

  // "add a section with an h2 Penguins and a paragraph: …"
  if (/\bsection\b/i.test(h) && /\bh2\b/i.test(h) && !/\bmain\b/i.test(h)) {
    const title = h.match(/\bh2\b\s+(.+?)(?:\s+and\b|\s*$)/i)?.[1];
    const body = h.match(/\bparagraph\s*[:—–-]\s*(.+)$/i)?.[1];
    if (title) {
      const h2 = tidy(title);
      return body
        ? `<section>\n  <h2>${h2}</h2>\n  <p>${tidy(body)}</p>\n</section>`
        : `<section>\n  <h2>${h2}</h2>\n</section>`;
    }
  }

  // "put the fun fact paragraph inside an aside" — wrap handled elsewhere.
  if (/\baside\b/i.test(h) && /\bparagraph\b/i.test(h)) return "";

  return "";
}

/**
 * Replace HTML / CSS TODO markers with markup or rules derived from the hint text.
 * Supports `<!-- TODO: … -->` and `/* TODO: … *​/` / `/* TODO 1: … *​/`.
 */
export function fillTodosInStarter(starter: string, language?: string): string {
  const lang = (language || "").toLowerCase().trim();
  let out = starter.replace(/<!--\s*TODO:\s*([\s\S]*?)-->/gi, (full, hint: string) => {
    const built = htmlFromTodoHint(String(hint));
    return built ? `\n${built}\n` : full;
  });

  out = out.replace(/\/\*\s*TODO(?:\s*\d+)?\s*:\s*([\s\S]*?)\*\//gi, (full, hint: string) => {
    const built =
      lang === "css" || (!lang && /\b(color|colour|border|navy|limegreen)\b/i.test(hint))
        ? cssFromTodoHint(String(hint))
        : htmlFromTodoHint(String(hint)) || cssFromTodoHint(String(hint));
    return built ? `\n${built}\n` : full;
  });

  return out;
}

/**
 * When the regex sample is a wrapper tag (nav/section/…) and the starter already
 * has the inner text nodes (e.g. Games / Books links), wrap those nodes instead
 * of appending a second copy of the menu.
 */
export function wrapHtmlElementsWithSample(starter: string, sample: string): string | null {
  const trimmed = text(sample);
  const outer = trimmed.match(/^<(\w+)(?:\s[^>]*)?>([\s\S]*)<\/\1\s*>$/i);
  if (!outer) return null;
  const tag = outer[1];
  const inner = outer[2];
  const texts = Array.from(inner.matchAll(/>([^<]+)</g))
    .map((m) => m[1].replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 1);
  if (!texts.length) return null;

  const first = texts[0];
  const last = texts[texts.length - 1];
  // Allow starter text to continue past the sample token ("Fun fact:" → full sentence).
  const startRe = new RegExp(
    `<[a-zA-Z][^>]*>\\s*${escapeRegExp(first)}[^<]*\\s*</`,
    "i",
  );
  const startMatch = starter.match(startRe);
  if (!startMatch || startMatch.index === undefined) return null;

  const startIdx = startMatch.index;
  const afterStart = starter.slice(startIdx);
  const endRe = new RegExp(
    `<[a-zA-Z][^>]*>\\s*${escapeRegExp(last)}[^<]*\\s*</[a-zA-Z]+\\s*>`,
    "i",
  );
  const endMatch = afterStart.match(endRe);
  if (!endMatch || endMatch.index === undefined) return null;

  const endIdx = startIdx + endMatch.index + endMatch[0].length;
  const before = starter.slice(0, startIdx);
  const middle = starter.slice(startIdx, endIdx).trim();
  const after = starter.slice(endIdx);

  // Already wrapped with this tag immediately around the span.
  if (
    new RegExp(`<${tag}\\b[^>]*>\\s*$`, "i").test(before) &&
    new RegExp(`^\\s*</${tag}\\s*>`, "i").test(after)
  ) {
    return null;
  }

  return `${before}<${tag}>\n  ${middle.replace(/\n/g, "\n  ")}\n</${tag}>${after}`;
}

/**
 * Finish a practice starter with a readable snippet from the grading pattern.
 * Prefer wrapping existing practice nodes; otherwise replace a TODO comment;
 * otherwise append the sample.
 */
export function completeStarterWithSample(
  starter: string,
  sample: string,
  language: string,
): string {
  const raw = text(starter);
  const snippet = text(sample);
  if (!raw) return snippet;
  if (!snippet) return stripPracticeComments(raw, language);

  const lang = (language || "").toLowerCase().trim();

  // CSS: merge rules — keep starter rules, append/replace sample rule.
  if (lang === "css") {
    const base = stripPracticeComments(raw, language);
    if (base.includes(snippet)) return base;
    const selector = snippet.match(/^([^{]+)\{/)?.[1]?.trim();
    if (selector) {
      const selRe = new RegExp(`${escapeRegExp(selector)}\\s*\\{[^}]*\\}`, "i");
      if (selRe.test(base)) return base.replace(selRe, snippet);
    }
    return `${base}\n${snippet}`.trim();
  }

  // HTML / markup: wrap existing practice elements when the sample is a wrapper.
  if (lang === "html" || lang === "web" || lang.startsWith("html") || /<\/?[a-z]/i.test(snippet)) {
    const cleaned = stripPracticeComments(raw, language);
    if (cleaned.includes(snippet)) return cleaned;

    const wrapped = wrapHtmlElementsWithSample(cleaned, snippet);
    if (wrapped) return stripPracticeComments(wrapped, language).trim();

    // Replace an authored TODO comment with the sample (footer / aside inserts).
    if (/<!--[\s\S]*?TODO[\s\S]*?-->/i.test(raw)) {
      const inserted = raw.replace(/<!--[\s\S]*?TODO[\s\S]*?-->/i, `\n${snippet}\n`);
      return stripPracticeComments(inserted, language);
    }

    return `${cleaned}\n${snippet}`.trim();
  }

  const base = stripPracticeComments(raw, language);
  if (base.includes(snippet)) return base;
  return `${base}\n${snippet}`.trim();
}

/**
 * Build the main-pane model answer for any course language.
 *
 * Priority:
 * 1. Plain expected code (not a regex)
 * 2. Practice starter that already passes
 * 3. Practice starter completed with a readable regex sample
 * 4. Teach demo / authored `code` ONLY when it passes the grader
 * 5. Readable regex sample alone
 * 6. Cleaned starter skeleton
 *
 * Never returns the teach demo when it fails the check. Never returns regex debris.
 */
export function modelMainAnswer(opts: {
  language: string;
  expectedCode?: string;
  starterCode?: string;
  exampleCode?: string;
  domChecks?: Array<Record<string, unknown>>;
}): string {
  const expected = text(opts.expectedCode);
  const starter = text(opts.starterCode);
  const demo = text(opts.exampleCode);
  const language = opts.language || "html";
  const isRegex =
    Boolean(expected) && (expected.startsWith("regex:") || isRegexExpectedCode(expected));

  // Plain expectedCode is the authored answer — show it as-is.
  if (expected && !isRegex) {
    return safeSource(expected) || expected;
  }

  const todoFilled = starter ? fillTodosInStarter(starter, language) : "";
  const practiceSource = todoFilled || starter;
  const cleanedStarter = practiceSource ? stripPracticeComments(practiceSource, language) : "";
  // Ignore leftover TODO markers that stripPracticeComments did not remove
  // (e.g. `// TODO` in a Python lesson). Empty practice must not beat a real solution.
  const practiceBody = cleanedStarter
    .replace(/\bTODO\b[:\s-]*/gi, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/^[ \t]*#.*$/gm, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  const hasPractice = Boolean(practiceBody);
  const demoPasses = Boolean(demo && safeSource(demo) && passesExpected(demo, expected, language));
  const demoFails = Boolean(demo) && !demoPasses;
  // When the teach demo fails the grader (Ada vs Leo / card vs profile), never fall back to it.
  const preferPractice = !demo || demoFails;

  if (hasPractice && passesExpected(cleanedStarter, expected, language)) {
    return cleanedStarter;
  }

  // CSS: merge starter + rules from TODOs / domChecks / expectedCode shapes.
  const fromDom = language === "css" ? cssFromDomChecks(opts.domChecks) : "";
  const todoHints: Array<{ selector: string; prop: string; value: string }> = [];
  if (language === "css" && starter) {
    for (const m of starter.matchAll(/\/\*\s*TODO(?:\s*\d+)?\s*:\s*([\s\S]*?)\*\//gi)) {
      const rule = cssFromTodoHint(m[1]);
      const parsed = rule.match(/^\s*(\.[^\s{]+)\s*\{\s*([a-z-]+)\s*:\s*([^;]+);/i);
      if (parsed) {
        todoHints.push({
          selector: parsed[1],
          prop: parsed[2],
          value: parsed[3].trim(),
        });
      }
    }
  }
  const fromRegexCss =
    language === "css" && expected
      ? cssSampleFromExpectedRegex(withRegexPrefix(expected), [
          ...todoHints,
          ...[...fromDom.matchAll(/^\s*(\.[^\s{]+)\s*\{([^}]+)\}/gm)].flatMap((m) => {
            const sel = m[1];
            return [...m[2].matchAll(/([a-z-]+)\s*:\s*([^;]+);/gi)].map((d) => ({
              selector: sel,
              prop: d[1],
              value: d[2].trim(),
            }));
          }),
        ])
      : "";

  const cssAddition = [fromDom, fromRegexCss]
    .filter(Boolean)
    .find((block) => block && !practiceBody.includes(block.split("{")[0].trim())) ||
    fromDom ||
    fromRegexCss;

  if (language === "css" && (cssAddition || todoFilled !== starter)) {
    const base = cleanedStarter || stripPracticeComments(todoFilled || starter, language);
    let merged = base;
    for (const block of [fromDom, fromRegexCss, cssFromDomChecks(opts.domChecks)]) {
      if (!block) continue;
      for (const rule of block.split(/\n\n+/)) {
        const sel = rule.match(/^\s*([^{]+)\s*\{/)?.[1]?.trim();
        if (!sel) continue;
        if (new RegExp(`${escapeRegExp(sel)}\\s*\\{`).test(merged)) continue;
        merged = `${merged}\n\n${rule.trim()}`.trim();
      }
    }
    // Also fold in TODO-filled rules that stripPracticeComments already kept.
    if (safeSource(merged)) {
      if (passesExpected(merged, expected, language) || preferPractice) {
        return merged;
      }
    }
  }

  const sample =
    isRegex && expected
      ? language === "css"
        ? cssSampleFromExpectedRegex(withRegexPrefix(expected), todoHints) ||
          sampleFromExpectedRegex(withRegexPrefix(expected))
        : sampleFromExpectedRegex(withRegexPrefix(expected))
      : "";
  const usableSample = safeSource(sample);

  // Complete a real practice skeleton (not an empty TODO-only starter).
  if (hasPractice && usableSample) {
    const completed = completeStarterWithSample(practiceSource, usableSample, language);
    if (safeSource(completed)) {
      if (passesExpected(completed, expected, language)) return completed;
      if (preferPractice) return completed;
    }
  }

  // Authored solution in `code` — only when it satisfies the grader.
  if (demoPasses) return demo;

  if (usableSample && passesExpected(usableSample, expected, language)) {
    return usableSample;
  }
  if (usableSample) return usableSample;

  if (hasPractice && safeSource(cleanedStarter)) return cleanedStarter;

  // Deliberately do NOT return a failing teach demo — that was the Ada/card-as-answer bug.
  return "";
}

/** Starter + demo source for the pane that the course language grades. */
function paneSources(
  example: NonNullable<AnswerReviewQuestion["code_example"]>,
  pane: keyof WebCodeSources,
): { starter: string; demo: string } {
  if (pane === "css") {
    return {
      starter: text(example.starterCss) || text(example.starterCode),
      demo: text(example.css) || text(example.code),
    };
  }
  if (pane === "javascript") {
    return {
      starter: text(example.starterCode),
      demo: text(example.code),
    };
  }
  return {
    starter: text(example.starterHtml) || text(example.starterCode),
    demo: text(example.html) || text(example.code),
  };
}

/**
 * The answer the author stored, for comparison.
 * Prefers `testCriteria` over the teach demo, puts `expectedCode` in the language pane,
 * and for regex checks builds readable source — never the raw pattern.
 */
export function buildAnswerReview(
  question: AnswerReviewQuestion,
  learner: { code: string; web?: WebCodeSources | null },
  options: { web: boolean; language: string },
): AnswerReview | null {
  if (question.type !== "code_test") return null;
  const criteria = question.testCriteria ?? {};
  const example = question.code_example ?? {};
  const language = options.language || example.language || "html";

  if (options.web) {
    const pane = webAnswerPane(language);
    const answer: WebCodeSources = {
      html: safeSource(text(criteria.expectedHTML)),
      css: safeSource(text(criteria.expectedCSS)),
      javascript: safeSource(text(criteria.expectedJS)),
    };

    const { starter, demo } = paneSources(example, pane);
    const main = modelMainAnswer({
      language,
      expectedCode: criteria.expectedCode,
      starterCode: starter,
      exampleCode: demo,
      domChecks: criteria.domChecks,
    });

    if (!answer[pane] && safeSource(main)) {
      answer[pane] = safeSource(main);
    }

    // Companion panes: shared styles / markup that are not the graded answer.
    // Never overwrite the graded pane with the teach demo.
    if (!answer.html && pane !== "html") {
      answer.html = text(example.html) || text(example.starterHtml);
    }
    if (!answer.css && pane !== "css") {
      answer.css = text(example.css) || text(example.starterCss);
    }
    if (!answer.javascript && pane !== "javascript") {
      answer.javascript = "";
    }

    // Final safety: strip any pane that still looks like a grading pattern.
    (["html", "css", "javascript"] as const).forEach((key) => {
      if (answer[key] && looksLikeRegexDebris(answer[key])) answer[key] = "";
    });

    if (!answer.html && !answer.css && !answer.javascript) return null;
    return {
      language,
      learner: { web: learner.web ?? { html: "", css: "", javascript: "" } },
      answer: { web: answer },
    };
  }

  const code = modelMainAnswer({
    language,
    expectedCode: criteria.expectedCode,
    starterCode: example.starterCode,
    exampleCode: example.code,
    domChecks: criteria.domChecks,
  });
  if (!safeSource(code)) return null;
  return { language, learner: { code: learner.code }, answer: { code: safeSource(code) } };
}
