import sampleV2Json from "../../../../../docs/CURRICULUM_V2_SAMPLE.json";
import sampleV2CaptionJson from "../../../../../docs/CURRICULUM_V2_CAPTION_SAMPLE.json";
import sampleV2TurtleJson from "../../../../../docs/CURRICULUM_V2_TURTLE_SAMPLE.json";
import type { CurriculumV2 } from "../types";

export const sampleV2Curriculum = sampleV2Json as CurriculumV2;

export const sampleV2CurriculumJSON = JSON.stringify(sampleV2Curriculum, null, 2);

export const sampleV2CaptionCurriculumJSON = JSON.stringify(
  sampleV2CaptionJson as CurriculumV2,
  null,
  2,
);

export const sampleV2TurtleCurriculumJSON = JSON.stringify(
  sampleV2TurtleJson as CurriculumV2,
  null,
  2,
);

export const V2_SAMPLE_DOWNLOADS = [
  {
    id: "flow",
    label: "Flow lesson (JavaScript)",
    description: "Full v2 template with speak, display, demo, and questions",
    filename: "flow-curriculum-v2-template.json",
    json: sampleV2CurriculumJSON,
  },
  {
    id: "caption",
    label: "Subtitle show() preview",
    description: "Short lesson to test spoken islands vs live subtitles",
    filename: "flow-curriculum-v2-caption-sample.json",
    json: sampleV2CaptionCurriculumJSON,
  },
  {
    id: "turtle",
    label: "Python Turtle shapes",
    description: "Visual Python / Turtle graphics in the v2 player",
    filename: "flow-curriculum-v2-turtle-sample.json",
    json: sampleV2TurtleCurriculumJSON,
  },
] as const;
