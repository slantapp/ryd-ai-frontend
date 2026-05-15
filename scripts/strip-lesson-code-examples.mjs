import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function stripFromCurriculum(curriculum) {
  let removed = 0;
  for (const mod of curriculum.modules ?? []) {
    for (const lesson of mod.lessons ?? []) {
      if (lesson.code_example) {
        delete lesson.code_example;
        removed += 1;
      }
    }
  }
  return removed;
}

function processJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  const curriculum = data.curriculum ?? data;
  const removed = stripFromCurriculum(curriculum);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return removed;
}

function stripFromTsFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const before = content;
  // Lesson-level blocks: media (optional props) then code_example before questions.
  content = content.replace(
    /(\n\s*media:\s*\{[^}]*\},)\s*\n\s*code_example:\s*\{[\s\S]*?\n\s*\},(?=\s*\n\s*questions:)/g,
    "$1",
  );
  if (content !== before) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

const jsonDir = path.join(root, "src", "data");
const jsonFiles = fs
  .readdirSync(jsonDir)
  .filter((f) => f.endsWith(".json"));

let totalJsonRemoved = 0;
for (const file of jsonFiles) {
  const n = processJsonFile(path.join(jsonDir, file));
  totalJsonRemoved += n;
  if (n > 0) console.log(`${file}: removed ${n} lesson code_example(s)`);
}

const tsPath = path.join(root, "src", "data", "curriculumData.ts");
if (stripFromTsFile(tsPath)) {
  console.log("curriculumData.ts: stripped lesson code_example blocks");
}

console.log(`Done. Total lesson code_examples removed from JSON: ${totalJsonRemoved}`);
