import sampleV2Json from "../../../../../docs/CURRICULUM_V2_SAMPLE.json";
import sampleV2CaptionJson from "../../../../../docs/CURRICULUM_V2_CAPTION_SAMPLE.json";
import sampleV2TurtleJson from "../../../../../docs/CURRICULUM_V2_TURTLE_SAMPLE.json";
import sampleV2GestureJson from "../../../../../docs/CURRICULUM_V2_GESTURE_SAMPLE.json";
import type { CurriculumV2, ModuleV2 } from "../types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Keep lesson and unlock links valid after the module ids are namespaced. */
function namespaceModules(
  modules: ModuleV2[],
  prefix: string,
  title: string,
): ModuleV2[] {
  const lessonIds = new Set(
    modules.flatMap((mod) => mod.lessons.map((lesson) => lesson.id)),
  );

  return modules.map((mod, index) => ({
    ...mod,
    id: `${prefix}_${mod.id}`,
    title: index === 0 ? title : `${title}: ${mod.title}`,
    unlock: mod.unlock?.requires
      ? { requires: `${prefix}_${mod.unlock.requires}` }
      : (mod.unlock ?? null),
    lessons: mod.lessons.map((lesson) => ({
      ...lesson,
      id: `${prefix}_${lesson.id}`,
      flow: lesson.flow.map((beat) => {
        if (
          beat.type === "bridge" &&
          typeof beat.next === "string" &&
          lessonIds.has(beat.next)
        ) {
          return { ...beat, next: `${prefix}_${beat.next}` };
        }
        return beat;
      }),
    })),
  }));
}

function buildTemplate(): CurriculumV2 {
  const template = clone(sampleV2Json) as CurriculumV2;
  const caption = sampleV2CaptionJson as CurriculumV2;
  const turtle = sampleV2TurtleJson as CurriculumV2;
  const gesture = sampleV2GestureJson as CurriculumV2;

  template.slug = "flow-curriculum-v2-template";
  template.curriculum.title = "Flow curriculum template";
  template.curriculum.description =
    "One v2 template with every sample scenario: JavaScript lessons, a formula and media beat, live subtitles, Python Turtle, and avatar gestures.";
  template.curriculum.modules = [
    ...template.curriculum.modules,
    ...namespaceModules(
      caption.curriculum.modules,
      "caption",
      "Sample: live subtitles",
    ),
    ...namespaceModules(
      turtle.curriculum.modules,
      "turtle",
      "Sample: Python Turtle",
    ),
    ...namespaceModules(
      gesture.curriculum.modules,
      "gesture",
      "Sample: avatar gestures",
    ),
  ];

  return template;
}

/** Single downloadable template. Every former sample is a module inside it. */
export const sampleV2Curriculum = buildTemplate();

export const sampleV2CurriculumJSON = JSON.stringify(sampleV2Curriculum, null, 2);

export const V2_TEMPLATE_FILENAME = "flow-curriculum-v2-template.json";
