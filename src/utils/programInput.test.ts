import assert from "node:assert/strict";
import test from "node:test";
import {
  assignPrefill,
  joinPromptAnswers,
  planProgramReads,
  programInputState,
  programReadsInput,
  stdinForRun,
} from "./programInput.ts";
import { CODE_SOLUTION_SPEECH, describeStoredAnswer } from "./storedAnswer.ts";

test("C++ includes are not treated as program input", () => {
  const source = `#include <iostream>\nint main() {\n  std::cout << "Hi";\n  std::cout << "there";\n  return 0;\n}`;
  assert.equal(programReadsInput(source), false);
  assert.equal(stdinForRun({ code: source }), undefined);
  assert.deepEqual(planProgramReads(source), { mode: "none" });
});

test("a fixed cin read becomes a prompt and keeps the authored answer", () => {
  const source = `std::cout << "Enter age: ";\nint age;\nstd::cin >> age;`;
  const plan = planProgramReads(source);
  assert.equal(plan.mode, "prompt");
  if (plan.mode !== "prompt") return;
  assert.equal(plan.prompts.length, 1);
  assert.equal(plan.prompts[0]?.label, "Enter age:");
  assert.equal(plan.prompts[0]?.line, 3);
  const offer = programInputState({
    key: "q1",
    exampleStdin: "10",
    exampleCode: source,
  });
  assert.equal(offer.show, false);
  assert.equal(offer.mode, "prompt");
  assert.equal(offer.prefill, "10");
  assert.deepEqual(assignPrefill("10", 1), ["10"]);
  assert.equal(stdinForRun({ code: source, stdin: "10" }), "10");
});

test("two cin reads ask twice and a question stdin overrides the example", () => {
  const source = "std::cin >> name >> age;";
  const plan = planProgramReads(source);
  assert.equal(plan.mode, "prompt");
  if (plan.mode !== "prompt") return;
  assert.deepEqual(
    plan.prompts.map((prompt) => prompt.label),
    ["Enter name", "Enter age"],
  );
  assert.deepEqual(assignPrefill("Ada 10", 2), ["Ada", "10"]);
  assert.equal(joinPromptAnswers(["Ada", "10"]), "Ada\n10\n");
  assert.equal(stdinForRun({ code: "input()", stdin: "Ada" }, "Ada 10"), "Ada 10");
});

test("an empty editor does not show the loop box just because stdin was set", () => {
  const offer = programInputState({
    key: "empty",
    exampleStdin: "Ada",
    editorCode: "",
    exampleCode: 'std::cout << "Enter name: ";\nstd::cin >> name;',
  });
  assert.equal(offer.show, false);
  assert.equal(offer.mode, "none");
  assert.equal(offer.prefill, "Ada");
});

test("a loop keeps the input box", () => {
  const source = "while (std::cin >> x) {\n  std::cout << x;\n}";
  const offer = programInputState({
    key: "loop",
    editorCode: source,
    exampleStdin: "1\n2\n",
  });
  assert.equal(planProgramReads(source).mode, "box");
  assert.equal(offer.show, true);
  assert.equal(offer.mode, "box");
  assert.equal(offer.hint, "loop");
});

test("comments and strings are not reads", () => {
  const source = `// cin >> age\nprint("input()")\n/* scanf("%d") */\nint main(){ return 0; }`;
  assert.equal(programReadsInput(source), false);
});

test("each supported language exposes a fixed read", () => {
  const samples: Array<[string, number, string?]> = [
    ['const name = prompt("Your name");', 1, "Your name"],
    ["const line = readline();", 1],
    ['name = input("Name")', 1, "Name"],
    ["line = stdin.readLineSync();", 1],
    ["int age = scanner.nextInt();", 1],
    ["val name = readln()", 1],
    ['scanf("%d %s", &age, name);', 2],
    ["std::cin >> age;", 1],
    ["string name = Console.ReadLine();", 1],
    ["fmt.Scan(&name, &age)", 2],
    ["io::stdin().read_line(&mut name).unwrap();", 1],
    ["$name = fgets(STDIN);", 1],
    ["name = gets", 1],
    ['read -p "Name: " name', 1, "Name:"],
    ["name = io.read()", 1],
    ["$name = <STDIN>;", 1],
    ["let name = readLine()", 1],
  ];

  for (const [source, count, label] of samples) {
    const plan = planProgramReads(source);
    assert.equal(plan.mode, "prompt", source);
    if (plan.mode !== "prompt") continue;
    assert.equal(plan.prompts.length, count, source);
    if (label) assert.equal(plan.prompts[0]?.label, label, source);
  }
});

test("looping and whole-stream reads keep the box", () => {
  const samples = [
    "for line in sys.stdin:\n    print(line)",
    "while True:\n    name = input()",
    "data = sys.stdin.read()",
    "Console.ReadToEnd()",
    "file_get_contents('php://stdin')",
    "fs.readFileSync('/dev/stdin')",
    "mapfile lines",
  ];
  for (const source of samples) {
    assert.equal(planProgramReads(source).mode, "box", source);
  }
});

test("a missed code question points at the editor instead of reading the source", () => {
  const stored = describeStoredAnswer({
    type: "code_test",
    testCriteria: { expectedCode: 'std::cout << "Hi";' },
  });
  assert.equal(stored.spoken, CODE_SOLUTION_SPEECH);
  assert.equal(stored.code, 'std::cout << "Hi";');
  assert.equal(stored.spoken?.includes("std::cout"), false);
});
