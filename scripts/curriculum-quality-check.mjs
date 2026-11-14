/**
 * Golden checks for View Answer + curriculum code_test lint.
 * Usage: node scripts/curriculum-quality-check.mjs
 */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const jiti = require("jiti")(fileURLToPath(import.meta.url));
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function runNodeTest(relPath) {
  const file = path.join(root, relPath);
  const result = spawnSync(
    process.execPath,
    ["--import", "jiti/register", "--test", file],
    { cwd: root, encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" } },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    console.error(`FAILED: ${relPath}`);
    process.exit(result.status || 1);
  }
  console.log(`ok ${relPath}`);
}

function lintJson(absPath, label) {
  if (!fs.existsSync(absPath)) {
    console.warn(`skip missing ${label}`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(absPath, "utf8"));
  const {
    lintCurriculumCodeTests,
    partitionCodeContractIssues,
  } = jiti(path.join(root, "src/utils/curriculumCodeContract.ts"));
  const { errors, warnings } = partitionCodeContractIssues(lintCurriculumCodeTests(data));
  if (warnings.length) {
    console.log(`\n${label} warnings (${warnings.length}):`);
    warnings.slice(0, 12).forEach((w) => console.log(`  - ${w}`));
    if (warnings.length > 12) console.log(`  … +${warnings.length - 12} more`);
  }
  if (errors.length) {
    console.error(`\n${label} ERRORS:`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log(`ok lint ${label}`);
}

console.log("Running curriculum quality checks…\n");

try {
  require.resolve("jiti");
} catch {
  console.error("jiti is required (npm install).");
  process.exit(1);
}

runNodeTest("src/utils/curriculumCodeContract.test.ts");
runNodeTest("src/utils/answerReview.test.ts");

lintJson(
  path.join(root, "docs/CURRICULUM_V2_SAMPLE.json"),
  "CURRICULUM_V2_SAMPLE.json",
);
lintJson(
  path.join(root, "docs/CURRICULUM_V2_TURTLE_SAMPLE.json"),
  "CURRICULUM_V2_TURTLE_SAMPLE.json",
);
lintJson(
  path.join(root, "../docs/HTML Step 8 - Page Layout Tags.json"),
  "HTML Step 8 - Page Layout Tags.json",
);

console.log("\nAll curriculum quality checks passed.");
