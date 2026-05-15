import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsPath = path.join(__dirname, "..", "src", "data", "curriculumData.ts");
let content = fs.readFileSync(tsPath, "utf8");

const importBlock = `import webDevelopmentBasics from "./web-development-basics.json";
import cssBasics from "./css-basics.json";
import htmlCssCombined from "./html-css-combined.json";
`;

if (!content.includes('import webDevelopmentBasics from "./web-development-basics.json"')) {
  const anchor = 'import cssFlexGridLessons from "./css_flex_grid_lessons.json";';
  if (!content.includes(anchor)) throw new Error("Import anchor not found");
  content = content.replace(anchor, `${anchor}\n${importBlock}`);
}

const arrayStart = "export const curriculaData: Curriculum[] = [";
const inlineStart = content.indexOf('{\n    slug: "web-development-basics"');
const inlineEnd = content.indexOf("  beginnerDetailed as Curriculum");
if (inlineStart === -1 || inlineEnd === -1) {
  if (content.includes("webDevelopmentBasics as Curriculum")) {
    console.log("curriculumData.ts already patched.");
    process.exit(0);
  }
  throw new Error("Could not locate inline curriculum block");
}

const replacement = `  webDevelopmentBasics as Curriculum,
  cssBasics as Curriculum,
  htmlCssCombined as Curriculum,
  `;

content =
  content.slice(0, inlineStart) +
  replacement +
  content.slice(inlineEnd);

fs.writeFileSync(tsPath, content, "utf8");
console.log("Patched curriculumData.ts");
