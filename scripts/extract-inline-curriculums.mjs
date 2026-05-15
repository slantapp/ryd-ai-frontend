import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const tsPath = path.join(root, "src", "data", "curriculumData.ts");
const content = fs.readFileSync(tsPath, "utf8");

const inlineStart = content.indexOf('{\n    slug: "web-development-basics"');
const inlineEnd = content.indexOf("  beginnerDetailed as Curriculum");
if (inlineStart === -1 || inlineEnd === -1) {
  throw new Error("Could not locate inline curriculum block in curriculumData.ts");
}

let inlineBlock = content.slice(inlineStart, inlineEnd).trim();
inlineBlock = inlineBlock.replace(/,\s*$/, "");
const arrayText = `[${inlineBlock}]`;

// Inline objects are valid JS object literals.
const curricula = new Function(`return ${arrayText}`)();

const dataDir = path.join(root, "src", "data");
for (const item of curricula) {
  const filePath = path.join(dataDir, `${item.slug}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(item, null, 2)}\n`, "utf8");
  console.log(`Wrote ${item.slug}.json`);
}

console.log(`Extracted ${curricula.length} curriculum file(s).`);
