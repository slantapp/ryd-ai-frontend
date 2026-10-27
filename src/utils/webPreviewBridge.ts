export const PREVIEW_MESSAGE_SOURCE = "ryd-web-preview";

export const PREVIEW_TIME_LIMIT_MESSAGE =
  "Your page took too long. Check for a loop that never ends.";

export type DomCheck = {
  selector?: string;
  text?: string;
  style?: string;
  equals?: string;
  click?: string;
  times?: number;
  then?: { selector: string; text?: string; style?: string; equals?: string };
};

export type HtmlCheck = {
  selector: string;
  text?: string;
  attr?: string;
  notEmpty?: boolean;
  count?: number;
};

export type CssCheck = {
  selector: string;
  style: string;
  equals: string;
};

export type PageCheck = DomCheck | HtmlCheck | CssCheck;

const KNOWN_TAGS = new Set([
  "html", "head", "body", "meta", "link", "title", "style", "script",
  "div", "span", "p", "a", "img", "ul", "ol", "li", "h1", "h2", "h3",
  "h4", "h5", "h6", "section", "main", "header", "footer", "nav",
  "button", "form", "input", "label", "textarea", "br", "hr", "strong",
  "em", "table", "tr", "td", "th", "thead", "tbody", "pre", "code",
  "blockquote", "figure", "figcaption", "video", "audio", "source",
  "canvas", "svg", "path", "iframe",
]);

const VOID_TAGS = new Set(["meta", "link", "img", "br", "hr", "input", "source"]);

/** Warnings only. They do not fail the answer. */
export function htmlAuthorWarnings(html: string): string[] {
  if (!html.trim()) return [];
  const warnings: string[] = [];
  const counts = new Map<string, { open: number; close: number }>();
  for (const match of html.matchAll(/<\/?([a-zA-Z][\w-]*)\b[^>]*>/g)) {
    const name = match[1].toLowerCase();
    const raw = match[0];
    if (!KNOWN_TAGS.has(name) && !name.includes("-")) {
      warnings.push(`Unknown tag <${name}>.`);
    }
    if (VOID_TAGS.has(name) || raw.endsWith("/>")) continue;
    const row = counts.get(name) ?? { open: 0, close: 0 };
    if (raw.startsWith("</")) row.close += 1;
    else row.open += 1;
    counts.set(name, row);
  }
  for (const [name, row] of counts) {
    if (row.open > row.close) warnings.push(`The <${name}> tag looks unclosed.`);
  }
  if (/<img\b(?![^>]*\balt\s*=)[^>]*>/i.test(html)) {
    warnings.push("An image is missing alt text.");
  }
  return [...new Set(warnings)];
}

export function hasPageChecks(criteria?: {
  domChecks?: unknown[];
  htmlChecks?: unknown[];
  cssChecks?: unknown[];
} | null): boolean {
  if (!criteria) return false;
  return Boolean(
    criteria.domChecks?.length ||
      criteria.htmlChecks?.length ||
      criteria.cssChecks?.length,
  );
}

export function collectPageChecks(criteria?: {
  domChecks?: unknown[];
  htmlChecks?: unknown[];
  cssChecks?: unknown[];
} | null): PageCheck[] {
  if (!criteria) return [];
  return [
    ...((criteria.domChecks ?? []) as PageCheck[]),
    ...((criteria.htmlChecks ?? []) as PageCheck[]),
    ...((criteria.cssChecks ?? []) as PageCheck[]),
  ];
}

function stdinLines(stdin?: string): string[] {
  if (!stdin) return [];
  const lines = stdin.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Runs before the learner script. Replaces alert, prompt, storage, and fetch. */
export const LEARNER_SCRIPT_MARKER = "/*RYD_LEARNER*/";

/**
 * Map a browser document line to the learner's JavaScript.
 * `markerLine` is the document line of LEARNER_SCRIPT_MARKER, which sits
 * on the line immediately before the learner's first line.
 */
export function mapLearnerErrorLine(
  documentLine: number,
  markerLine: number,
  lineCount: number,
): number | undefined {
  if (!markerLine || !documentLine || lineCount < 1) return undefined;
  const learner = documentLine - markerLine;
  if (learner < 1 || learner > lineCount) return undefined;
  return learner;
}

/** Fill the preview script's line-map placeholders after the document is built. */
export function applyLearnerLineMap(documentHtml: string, learnerLineCount: number): string {
  const markerAt = documentHtml.indexOf(LEARNER_SCRIPT_MARKER);
  const markerLine = markerAt < 0 ? 0 : documentHtml.slice(0, markerAt).split("\n").length;
  return documentHtml
    .replaceAll("__RYD_LEARNER_LINE__", String(markerLine))
    .replaceAll("__RYD_LEARNER_COUNT__", String(markerAt < 0 ? 0 : learnerLineCount));
}

export function previewPreamble(options?: {
  stdin?: string;
  mocks?: Record<string, unknown>;
}): string {
  const lines = JSON.stringify(stdinLines(options?.stdin));
  const mocks = JSON.stringify(options?.mocks ?? {});
  return `
(function () {
  var source = ${JSON.stringify(PREVIEW_MESSAGE_SOURCE)};
  var stdinLines = ${lines};
  var stdinIndex = 0;
  var mocks = ${mocks};
  function send(payload) {
    try { parent.postMessage(Object.assign({ source: source }, payload), "*"); } catch (e) {}
  }
  ["log", "info", "warn", "error"].forEach(function (level) {
    console[level] = function () {
      var message = Array.prototype.map.call(arguments, function (item) {
        return String(item);
      }).join(" ");
      send({ type: "log", level: level, message: message });
    };
  });
  var learnerMarkerLine = __RYD_LEARNER_LINE__;
  var learnerLineCount = __RYD_LEARNER_COUNT__;
  window.addEventListener("error", function (event) {
    var line = event.lineno || 0;
    var mapped;
    if (learnerMarkerLine && line > learnerMarkerLine && line <= learnerMarkerLine + learnerLineCount) {
      mapped = line - learnerMarkerLine;
    }
    send({ type: "log", level: "error", message: event.message || "Error", line: mapped });
  });
  function showBox(message) {
    var box = document.createElement("div");
    box.setAttribute("role", "dialog");
    box.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:2147483646;font-family:sans-serif;";
    var card = document.createElement("div");
    card.style.cssText = "background:#fff;color:#111;padding:16px;border-radius:12px;max-width:280px;box-shadow:0 12px 40px rgba(0,0,0,.2);";
    var text = document.createElement("p");
    text.textContent = String(message);
    text.style.margin = "0 0 12px";
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "OK";
    button.style.cssText = "border:0;background:#4f46e5;color:#fff;border-radius:8px;padding:6px 12px;";
    button.onclick = function () { box.remove(); };
    card.appendChild(text);
    card.appendChild(button);
    box.appendChild(card);
    (document.body || document.documentElement).appendChild(box);
    send({ type: "log", level: "log", message: String(message) });
  }
  window.alert = showBox;
  window.confirm = function (message) { showBox(message); return true; };
  window.prompt = function () {
    var next = stdinIndex < stdinLines.length ? stdinLines[stdinIndex] : "";
    stdinIndex += 1;
    return next;
  };
  var store = Object.create(null);
  var memoryStorage = {
    getItem: function (key) { key = String(key); return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem: function (key, value) { store[String(key)] = String(value); },
    removeItem: function (key) { delete store[String(key)]; },
    clear: function () { Object.keys(store).forEach(function (key) { delete store[key]; }); },
    key: function (index) { return Object.keys(store)[index] || null; },
    get length() { return Object.keys(store).length; }
  };
  try {
    Object.defineProperty(window, "localStorage", { configurable: true, get: function () { return memoryStorage; } });
  } catch (e) {}
  window.fetch = function (input) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var path = String(url).replace(/^https?:\\/\\/[^/]+/, "");
    if (Object.prototype.hasOwnProperty.call(mocks, url) || Object.prototype.hasOwnProperty.call(mocks, path)) {
      var body = Object.prototype.hasOwnProperty.call(mocks, url) ? mocks[url] : mocks[path];
      var text = typeof body === "string" ? body : JSON.stringify(body);
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(body); }, text: function () { return Promise.resolve(text); } });
    }
    return Promise.reject(new Error("This lesson has no network for " + url));
  };
})();
`.trim();
}

/** Runs after the learner script and posts check results, then idle. */
export function previewEpilogue(checks: PageCheck[] = []): string {
  return `
(function () {
  var source = ${JSON.stringify(PREVIEW_MESSAGE_SOURCE)};
  var checks = ${JSON.stringify(checks)};
  function send(payload) {
    try { parent.postMessage(Object.assign({ source: source }, payload), "*"); } catch (e) {}
  }
  function normColor(value) {
    var probe = document.createElement("span");
    probe.style.color = String(value || "");
    document.body.appendChild(probe);
    var computed = getComputedStyle(probe).color.replace(/\\s/g, "");
    probe.remove();
    return computed;
  }
  function styleOf(el, name) {
    if (!el) return "";
    var computed = getComputedStyle(el);
    return computed.getPropertyValue(name) || computed[name] || "";
  }
  function sameStyle(got, expected) {
    if (!expected) return true;
    if (String(got).replace(/\\s/g, "") === String(expected).replace(/\\s/g, "")) return true;
    return normColor(got) === normColor(expected);
  }
  var results = [];
  checks.forEach(function (check) {
    if (check.click) {
      var clicked = document.querySelector(check.click);
      var times = check.times || 1;
      for (var i = 0; i < times; i += 1) { if (clicked && clicked.click) clicked.click(); }
    }
    var expect = check.then || check;
    if (expect.selector && expect.count != null) {
      var count = document.querySelectorAll(expect.selector).length;
      var countOk = count === expect.count;
      results.push({ test: countOk ? "The page has the right number of items." : "The page should have " + expect.count + " matching " + expect.selector + ".", passed: countOk });
      return;
    }
    if (expect.selector && expect.attr) {
      var nodes = document.querySelectorAll(expect.selector);
      var attrOk = nodes.length > 0 && Array.prototype.every.call(nodes, function (node) {
        return String(node.getAttribute(expect.attr) || "").trim().length > 0;
      });
      results.push({ test: attrOk ? "Every image has alt text." : "An image is missing alt text.", passed: attrOk });
      return;
    }
    if (expect.selector && expect.text != null) {
      var node = document.querySelector(expect.selector);
      var text = node ? (node.textContent || "").trim() : "";
      var textOk = text === String(expect.text).trim();
      results.push({ test: textOk ? "The page shows the expected text." : "The page should show “" + String(expect.text).trim() + "”.", passed: textOk });
      return;
    }
    if (expect.selector && expect.style && expect.equals != null) {
      var styled = document.querySelector(expect.selector);
      var got = styleOf(styled, expect.style);
      var styleOk = Boolean(styled) && sameStyle(got, expect.equals);
      results.push({ test: styleOk ? "The style matches." : "The " + expect.style + " should be " + expect.equals + ".", passed: styleOk });
    }
  });
  if (results.length) send({ type: "checks", results: results });
  send({ type: "idle" });
})();
`.trim();
}
