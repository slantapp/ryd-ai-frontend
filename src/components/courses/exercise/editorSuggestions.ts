import type { Monaco } from "@monaco-editor/react";

/**
 * Keyword suggestions for languages whose Monaco build has highlighting
 * but no language server. JavaScript and TypeScript keep Monaco's own
 * completion worker. This is the in-lesson set, not the VS Code marketplace.
 */
const KEYWORDS: Record<string, string[]> = {
  python: [
    "False", "None", "True", "and", "as", "assert", "async", "await", "break",
    "class", "continue", "def", "del", "elif", "else", "except", "finally",
    "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal",
    "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
    "print", "range", "len", "input", "int", "str", "list", "dict", "set",
  ],
  cpp: [
    "alignas", "alignof", "and", "and_eq", "asm", "auto", "bitand", "bitor",
    "bool", "break", "case", "catch", "char", "class", "const", "constexpr",
    "continue", "default", "delete", "do", "double", "else", "enum", "explicit",
    "export", "extern", "false", "float", "for", "friend", "goto", "if",
    "inline", "int", "long", "mutable", "namespace", "new", "noexcept",
    "nullptr", "operator", "private", "protected", "public", "return", "short",
    "signed", "sizeof", "static", "struct", "switch", "template", "this",
    "throw", "true", "try", "typedef", "typeid", "typename", "union",
    "unsigned", "using", "virtual", "void", "volatile", "while",
    "include", "cout", "cin", "endl", "string", "vector", "std", "main",
    "printf", "scanf",
  ],
  c: [
    "auto", "break", "case", "char", "const", "continue", "default", "do",
    "double", "else", "enum", "extern", "float", "for", "goto", "if", "inline",
    "int", "long", "register", "return", "short", "signed", "sizeof", "static",
    "struct", "switch", "typedef", "union", "unsigned", "void", "volatile",
    "while", "include", "printf", "scanf", "main", "NULL",
  ],
  java: [
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
    "class", "const", "continue", "default", "do", "double", "else", "enum",
    "extends", "final", "finally", "float", "for", "goto", "if", "implements",
    "import", "instanceof", "int", "interface", "long", "native", "new",
    "package", "private", "protected", "public", "return", "short", "static",
    "strictfp", "super", "switch", "synchronized", "this", "throw", "throws",
    "transient", "try", "void", "volatile", "while", "true", "false", "null",
    "String", "System", "out", "println",
  ],
  kotlin: [
    "as", "break", "class", "continue", "do", "else", "false", "for", "fun",
    "if", "in", "interface", "is", "null", "object", "package", "return",
    "super", "this", "throw", "true", "try", "typealias", "typeof", "val",
    "var", "when", "while", "println",
  ],
  csharp: [
    "abstract", "as", "base", "bool", "break", "byte", "case", "catch", "char",
    "checked", "class", "const", "continue", "decimal", "default", "delegate",
    "do", "double", "else", "enum", "event", "explicit", "extern", "false",
    "finally", "fixed", "float", "for", "foreach", "goto", "if", "implicit",
    "in", "int", "interface", "internal", "is", "lock", "long", "namespace",
    "new", "null", "object", "operator", "out", "override", "params", "private",
    "protected", "public", "readonly", "ref", "return", "sbyte", "sealed",
    "short", "sizeof", "stackalloc", "static", "string", "struct", "switch",
    "this", "throw", "true", "try", "typeof", "uint", "ulong", "unchecked",
    "unsafe", "ushort", "using", "virtual", "void", "volatile", "while",
    "Console", "WriteLine",
  ],
  go: [
    "break", "case", "chan", "const", "continue", "default", "defer", "else",
    "fallthrough", "for", "func", "go", "goto", "if", "import", "interface",
    "map", "package", "range", "return", "select", "struct", "switch", "type",
    "var", "nil", "true", "false", "fmt", "Println",
  ],
  rust: [
    "as", "async", "await", "break", "const", "continue", "crate", "dyn",
    "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in", "let",
    "loop", "match", "mod", "move", "mut", "pub", "ref", "return", "self",
    "Self", "static", "struct", "super", "trait", "true", "type", "unsafe",
    "use", "where", "while", "println",
  ],
  php: [
    "abstract", "and", "array", "as", "break", "callable", "case", "catch",
    "class", "clone", "const", "continue", "declare", "default", "die", "do",
    "echo", "else", "elseif", "empty", "enddeclare", "endfor", "endforeach",
    "endif", "endswitch", "endwhile", "eval", "exit", "extends", "final",
    "finally", "fn", "for", "foreach", "function", "global", "goto", "if",
    "implements", "include", "include_once", "instanceof", "insteadof",
    "interface", "isset", "list", "match", "namespace", "new", "or", "print",
    "private", "protected", "public", "require", "require_once", "return",
    "static", "switch", "throw", "trait", "try", "unset", "use", "var",
    "while", "xor", "yield",
  ],
  ruby: [
    "alias", "and", "begin", "break", "case", "class", "def", "defined?",
    "do", "else", "elsif", "end", "ensure", "false", "for", "if", "in",
    "module", "next", "nil", "not", "or", "redo", "rescue", "retry", "return",
    "self", "super", "then", "true", "undef", "unless", "until", "when",
    "while", "yield", "puts", "print",
  ],
  shell: [
    "if", "then", "else", "elif", "fi", "case", "esac", "for", "while", "until",
    "do", "done", "in", "function", "echo", "exit", "return", "local", "export",
  ],
  lua: [
    "and", "break", "do", "else", "elseif", "end", "false", "for", "function",
    "goto", "if", "in", "local", "nil", "not", "or", "repeat", "return",
    "then", "true", "until", "while", "print",
  ],
  perl: [
    "if", "else", "elsif", "unless", "while", "until", "for", "foreach",
    "sub", "my", "our", "return", "print", "say", "use", "package", "last",
    "next", "redo",
  ],
  swift: [
    "associatedtype", "class", "deinit", "enum", "extension", "fileprivate",
    "func", "import", "init", "inout", "internal", "let", "open", "operator",
    "private", "protocol", "public", "rethrows", "static", "struct", "subscript",
    "typealias", "var", "break", "case", "continue", "default", "defer", "do",
    "else", "fallthrough", "for", "guard", "if", "in", "repeat", "return",
    "switch", "where", "while", "as", "false", "is", "nil", "self", "Self",
    "super", "true", "try", "print",
  ],
  dart: [
    "assert", "break", "case", "catch", "class", "const", "continue", "default",
    "do", "else", "enum", "extends", "false", "final", "finally", "for", "if",
    "in", "is", "new", "null", "rethrow", "return", "super", "switch", "this",
    "throw", "true", "try", "var", "void", "while", "with", "async", "await",
    "yield", "print",
  ],
  html: [
    "html", "head", "body", "title", "h1", "h2", "p", "a", "img", "div", "span",
    "button", "input", "ul", "ol", "li", "table", "form", "style", "script",
    "br", "strong", "em",
  ],
  css: [
    "color", "background", "background-color", "font-size", "font-weight",
    "margin", "padding", "border", "border-radius", "display", "width",
    "height", "text-align", "flex", "grid", "position", "top", "left", "right",
    "bottom",
  ],
};

const registered = new Set<string>();

/** Register keyword suggestions once per Monaco language. */
export function registerEditorSuggestions(monaco: Monaco, languageId: string) {
  if (registered.has(languageId)) return;
  const keywords = KEYWORDS[languageId];
  registered.add(languageId);
  if (!keywords?.length) return;

  monaco.languages.registerCompletionItemProvider(languageId, {
    triggerCharacters: [".", ":", "<", "#"],
    provideCompletionItems(
      model: {
        getWordUntilPosition: (cursor: {
          lineNumber: number;
          column: number;
        }) => { word: string; startColumn: number; endColumn: number };
      },
      position: { lineNumber: number; column: number },
    ) {
      const word = model.getWordUntilPosition(position);
      const prefix = word.word.toLowerCase();
      if (!prefix) return { suggestions: [] };
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: keywords
          .filter((keyword) => keyword.toLowerCase().startsWith(prefix))
          .map((keyword) => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
          })),
      };
    },
  });
}
