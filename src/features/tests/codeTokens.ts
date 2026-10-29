/**
 * Tiny syntax colouring for test cards. Cards hold a few lines of code, so a regex tokenizer is
 * enough and keeps Monaco off this page. Colours follow the flashcard guide.
 */
export type CodeToken = { text: string; kind: "keyword" | "string" | "number" | "comment" | "call" | "plain" };

export const TOKEN_COLORS: Record<CodeToken["kind"], string> = {
  keyword: "#F0ABFC",
  string: "#86EFAC",
  number: "#FDE68A",
  comment: "#8B8699",
  call: "#93C5FD",
  plain: "#E9E4F0",
};

const KEYWORDS: Record<string, string[]> = {
  python: ["def", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or", "import", "from", "as", "class", "True", "False", "None", "print", "range", "len", "break", "continue", "pass", "lambda", "try", "except", "with", "is"],
  javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "of", "in", "new", "class", "true", "false", "null", "undefined", "console", "import", "export", "from", "break", "continue", "typeof", "async", "await"],
  c: ["int", "char", "float", "double", "void", "return", "if", "else", "for", "while", "include", "printf", "struct", "const", "bool", "true", "false", "using", "namespace", "std", "cout", "cin", "endl", "string", "auto"],
  ruby: ["def", "end", "puts", "if", "elsif", "else", "do", "each", "while", "return", "true", "false", "nil", "class"],
  lua: ["local", "function", "end", "if", "then", "else", "elseif", "for", "do", "while", "return", "true", "false", "nil", "print"],
  php: ["echo", "function", "return", "if", "else", "foreach", "for", "while", "as", "true", "false", "null", "class", "new"],
};

function keywordsFor(language: string | null | undefined): Set<string> {
  const lang = String(language || "").toLowerCase();
  if (lang.startsWith("py")) return new Set(KEYWORDS.python);
  if (lang.includes("script") || lang === "js" || lang === "ts" || lang === "html") return new Set(KEYWORDS.javascript);
  if (lang === "c" || lang.includes("c++") || lang === "cpp" || lang.includes("java") || lang.includes("c#")) return new Set([...KEYWORDS.c, ...KEYWORDS.javascript]);
  if (lang.startsWith("rb") || lang === "ruby") return new Set(KEYWORDS.ruby);
  if (lang === "lua") return new Set(KEYWORDS.lua);
  if (lang === "php") return new Set(KEYWORDS.php);
  return new Set([...KEYWORDS.python, ...KEYWORDS.javascript]);
}

const TOKEN_RE =
  /(#[^\n]*|\/\/[^\n]*|--[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)(?=\s*\()|([A-Za-z_][A-Za-z0-9_]*)/g;

export function tokenizeCode(code: string, language?: string | null): CodeToken[] {
  const keywords = keywordsFor(language);
  const lang = String(language || "").toLowerCase();
  const hashComments = lang.startsWith("py") || lang === "ruby" || lang.startsWith("rb") || !lang;
  const out: CodeToken[] = [];
  let last = 0;
  for (const m of code.matchAll(TOKEN_RE)) {
    const index = m.index ?? 0;
    if (index > last) out.push({ text: code.slice(last, index), kind: "plain" });
    const [text, comment, str, number, call, word] = m;
    if (comment) {
      const isComment =
        (comment.startsWith("#") && hashComments) ||
        (comment.startsWith("//") && !lang.startsWith("py")) ||
        (comment.startsWith("--") && lang === "lua");
      out.push({ text, kind: isComment ? "comment" : "plain" });
    } else if (str) out.push({ text, kind: "string" });
    else if (number) out.push({ text, kind: "number" });
    else if (call) out.push({ text, kind: keywords.has(call) ? "keyword" : "call" });
    else if (word) out.push({ text, kind: keywords.has(word) ? "keyword" : "plain" });
    else out.push({ text, kind: "plain" });
    last = index + text.length;
  }
  if (last < code.length) out.push({ text: code.slice(last), kind: "plain" });
  return out;
}
