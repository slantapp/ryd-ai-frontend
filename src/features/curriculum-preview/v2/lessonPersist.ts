import type { WebCodeSources } from "@/utils/webCodeWorkspace";
import { EMPTY_WEB_CODE } from "@/utils/webCodeWorkspace";

export type V2LessonDraft = {
  beatIndex: number;
  completedBeatIds?: string[];
  code?: string;
  webCode?: WebCodeSources;
  formulaAnswer?: string;
  resumePractice?: boolean;
};

function storageKey(scope: string, lessonId: string): string {
  return `ryd-v2-lesson:${scope}:${lessonId}`;
}

export function loadV2LessonDraft(
  storage: Storage | null | undefined,
  scope: string,
  lessonId: string,
): V2LessonDraft | null {
  if (!storage || !scope || !lessonId) return null;
  try {
    const raw = storage.getItem(storageKey(scope, lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as V2LessonDraft;
    if (typeof parsed?.beatIndex !== "number" || parsed.beatIndex < 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveV2LessonDraft(
  storage: Storage | null | undefined,
  scope: string,
  lessonId: string,
  draft: V2LessonDraft,
): void {
  if (!storage || !scope || !lessonId) return;
  try {
    storage.setItem(storageKey(scope, lessonId), JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function clearV2LessonDraft(
  storage: Storage | null | undefined,
  scope: string,
  lessonId: string,
): void {
  if (!storage || !scope || !lessonId) return;
  try {
    storage.removeItem(storageKey(scope, lessonId));
  } catch {
    /* ignore */
  }
}

export function emptyWebDraft(): WebCodeSources {
  return { ...EMPTY_WEB_CODE };
}
