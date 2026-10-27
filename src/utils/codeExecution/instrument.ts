/**
 * Small additions to the learner's source before it goes to Judge0.
 *
 * - Python, C, and C++ print each line as soon as it is written, so a program
 *   stopped for time still shows what it printed.
 * - A live-input run of C++ stops with a marker when `std::cin` reaches the end
 *   of the answers given so far, instead of looping on a failed read.
 * - A live-input run seeds `random`, so each re-run picks the same numbers.
 * - matplotlib draws with Agg, and `plt.show()` prints each figure as a PNG line.
 *
 * Python additions go on one line above the learner's code, so Python line
 * numbers in errors are moved back by `lineOffset`. C and C++ additions go
 * after the learner's code and do not move any line.
 */

/** Printed to stderr by the C++ input guard when the program needs another answer. */
export const WAITING_FOR_INPUT_MARKER = "RYD_WAITING_FOR_INPUT";

/** Start of a console line that holds a picture, such as a matplotlib figure. */
export const IMAGE_LINE_PREFIX = "@@image@@";

export type InstrumentOptions = {
  /** The program is re-run with one more answer each time it waits. */
  live?: boolean;
  /** Seed for `random` in a live run. */
  seed?: number;
};

export type InstrumentedSource = {
  source: string;
  /** Lines added above the learner's first line. */
  lineOffset: number;
};

const PYTHON_UNBUFFERED =
  'import sys as _ryd_sys; getattr(_ryd_sys.stdout, "reconfigure", lambda **_ryd_k: None)(line_buffering=True); del _ryd_sys';

// `except:` or `except Exception:` around input() would catch EOFError and loop,
// so a live run leaves through os._exit, which no except clause can stop.
const PYTHON_INPUT_GUARD = [
  "import builtins as _ryd_builtins, sys as _ryd_sys, os as _ryd_os",
  "def _ryd_input(*_ryd_args, _ryd_read=_ryd_builtins.input, _ryd_sys=_ryd_sys, _ryd_os=_ryd_os):",
  "    try:",
  "        return _ryd_read(*_ryd_args)",
  "    except EOFError:",
  "        _ryd_sys.stdout.flush()",
  `        _ryd_sys.stderr.write("${WAITING_FOR_INPUT_MARKER}\\n")`,
  "        _ryd_sys.stderr.flush()",
  "        _ryd_os._exit(3)",
  "_ryd_builtins.input = _ryd_input",
  "del _ryd_builtins, _ryd_sys, _ryd_os",
].join("\n");

const PYTHON_PLOTS = [
  "try:",
  "    import matplotlib as _ryd_mpl; _ryd_mpl.use(\"Agg\"); import matplotlib.pyplot as _ryd_plt",
  "    def _ryd_show(*_ryd_a, **_ryd_k):",
  "        import io as _ryd_io, base64 as _ryd_b64",
  "        for _ryd_n in _ryd_plt.get_fignums():",
  "            _ryd_buf = _ryd_io.BytesIO()",
  "            _ryd_plt.figure(_ryd_n).savefig(_ryd_buf, format=\"png\", dpi=90, bbox_inches=\"tight\")",
  `            print("${IMAGE_LINE_PREFIX}data:image/png;base64," + _ryd_b64.b64encode(_ryd_buf.getvalue()).decode("ascii"), flush=True)`,
  "        _ryd_plt.close(\"all\")",
  "    _ryd_plt.show = _ryd_show",
  "except Exception:",
  "    pass",
].join("\n");

const C_UNBUFFERED = `
#include <stdio.h>
__attribute__((constructor)) static void ryd_runner_line_buffer(void) { setvbuf(stdout, NULL, _IOLBF, BUFSIZ); }
`;

const CPP_UNBUFFERED = `
#include <cstdio>
namespace ryd_runner {
struct LineBuffer {
  LineBuffer() { std::setvbuf(stdout, nullptr, _IOLBF, BUFSIZ); }
};
static LineBuffer line_buffer;
}
`;

const CPP_INPUT_GUARD = `
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <streambuf>
namespace ryd_runner {
class WaitForInput : public std::streambuf {
 public:
  explicit WaitForInput(std::streambuf* source) : source_(source) {}

 protected:
  int_type underflow() override { return check(source_->sgetc()); }
  int_type uflow() override { return check(source_->sbumpc()); }

 private:
  static int_type check(int_type next) {
    if (traits_type::eq_int_type(next, traits_type::eof())) {
      std::cout.flush();
      std::fflush(stdout);
      std::fputs("${WAITING_FOR_INPUT_MARKER}\\n", stderr);
      std::fflush(stderr);
      std::_Exit(3);
    }
    return next;
  }
  std::streambuf* source_;
};
struct InstallInputGuard {
  InstallInputGuard() {
    static WaitForInput guard(std::cin.rdbuf());
    std::cin.rdbuf(&guard);
  }
};
static InstallInputGuard input_guard;
}
`;

function usesRandom(code: string): boolean {
  return /^\s*(?:import\s+[^\n]*\brandom\b|from\s+random\s+import)/m.test(code);
}

function usesPlots(code: string): boolean {
  return /^\s*(?:import\s+matplotlib|from\s+matplotlib)/m.test(code);
}

/** Lines on which a learner's program might contain `srand(time(...))`. */
function seedCppRandom(code: string, seed: number): string {
  return code.replace(/\b((?:std::)?srand\s*\()([^;\n]*)\)\s*;/g, (whole, open: string, inner: string) => {
    const fixed = inner.replace(
      /(?:std::)?time\s*\(\s*(?:0|NULL|nullptr)?\s*\)/g,
      String(seed >>> 0),
    );
    return fixed === inner ? whole : `${open}${fixed});`;
  });
}

export function instrumentSource(
  code: string,
  language?: string,
  options?: InstrumentOptions,
): InstrumentedSource {
  const lang = (language || "").toLowerCase().trim();
  const seed = options?.seed ?? 1;

  if (lang === "python" || lang === "python3" || lang === "py") {
    // `from __future__` must stay the first statement.
    if (/^\s*from\s+__future__\s+import\b/m.test(code)) return { source: code, lineOffset: 0 };
    const head = [PYTHON_UNBUFFERED];
    if (options?.live && usesRandom(code)) {
      head.push(`import random as _ryd_random; _ryd_random.seed(${seed >>> 0}); del _ryd_random`);
    }
    let prelude = head.join("; ");
    if (options?.live) prelude = `${prelude}\n${PYTHON_INPUT_GUARD}`;
    if (usesPlots(code)) prelude = `${prelude}\n${PYTHON_PLOTS}`;
    const lineOffset = prelude.split("\n").length;
    return { source: `${prelude}\n${code}`, lineOffset };
  }

  if (lang === "cpp" || lang === "c++") {
    let source = options?.live ? seedCppRandom(code, seed) : code;
    source = `${source}\n${CPP_UNBUFFERED}`;
    if (options?.live) source = `${source}${CPP_INPUT_GUARD}`;
    return { source, lineOffset: 0 };
  }

  if (lang === "c") {
    return { source: `${code}\n${C_UNBUFFERED}`, lineOffset: 0 };
  }

  return { source: code, lineOffset: 0 };
}

/** Move Python file line numbers back over the lines added above the learner's code. */
export function shiftScriptLines(text: string | null | undefined, offset: number): string {
  if (!text || offset <= 0) return text ?? "";
  return text.replace(
    /(File "[^"]*script\.py", line )(\d+)/g,
    (_whole, head: string, value: string) => `${head}${Math.max(1, Number(value) - offset)}`,
  );
}

/** Pull figure lines out of stdout. They show as pictures, not as printed text. */
export function splitImageLines(stdout: string): { text: string; images: string[] } {
  if (!stdout.includes(IMAGE_LINE_PREFIX)) return { text: stdout, images: [] };
  const images: string[] = [];
  const kept: string[] = [];
  for (const line of stdout.split("\n")) {
    if (line.startsWith(IMAGE_LINE_PREFIX)) images.push(line.slice(IMAGE_LINE_PREFIX.length).trim());
    else kept.push(line);
  }
  return { text: kept.join("\n"), images };
}
