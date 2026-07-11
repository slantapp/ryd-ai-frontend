import sampleV2Json from "../../../../../docs/CURRICULUM_V2_SAMPLE.json";
import type { CurriculumV2 } from "../types";

export const sampleV2Curriculum = sampleV2Json as CurriculumV2;

export const sampleV2CurriculumJSON = JSON.stringify(sampleV2Curriculum, null, 2);
