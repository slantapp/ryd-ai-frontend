import { useEffect } from "react";
import {
  INSTRUCTORS,
  type InstructorType,
  useInstructorStore,
} from "@/stores/instructorStore";

const prefetchedAssets = new Set<string>();
let narratorAvatarImport: Promise<unknown> | null = null;
let talkingHeadImport: Promise<unknown> | null = null;

/** Warm the browser cache for a static avatar asset (GLB, FBX, etc.). */
export function prefetchAvatarAsset(url: string) {
  if (!url || prefetchedAssets.has(url)) return;
  prefetchedAssets.add(url);

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "fetch";
  link.href = url;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);

  void fetch(url).catch(() => {
    prefetchedAssets.delete(url);
  });
}

/** Download the selected instructor's 3D model. */
export function prefetchAvatarModel(instructor?: InstructorType) {
  const selected =
    instructor ?? useInstructorStore.getState().selectedInstructor;
  prefetchAvatarAsset(INSTRUCTORS[selected].avatarUrl);
}

const AVATAR_ANIMATION_URLS = [
  "/animations/dance.fbx",
  "/animations/Disappointed.fbx",
] as const;

export function prefetchAvatarAnimations() {
  for (const url of AVATAR_ANIMATION_URLS) {
    prefetchAvatarAsset(url);
  }
}

/** Warm the narrator-avatar JS chunk (CourseDetails, preview, settings). */
export function prefetchNarratorAvatarBundle() {
  narratorAvatarImport ??= import("narrator-avatar");
  return narratorAvatarImport;
}

/** Warm the talking-head chunk (ExercisePage / AvatarContainer). */
export function prefetchTalkingHeadBundle() {
  talkingHeadImport ??= import("@sage-rsc/talking-head-react");
  return talkingHeadImport;
}

/**
 * Prefetch avatar model + JS bundles for the selected instructor.
 * Safe to call multiple times — work is deduped.
 */
export function prefetchAvatar(instructor?: InstructorType) {
  prefetchAvatarModel(instructor);
  prefetchAvatarAnimations();
  void prefetchNarratorAvatarBundle();
  void prefetchTalkingHeadBundle();
}

/** Prefetch when a route mounts that will show the instructor soon. */
export function usePrefetchAvatar(enabled = true, instructor?: InstructorType) {
  useEffect(() => {
    if (!enabled) return;
    prefetchAvatar(instructor);
  }, [enabled, instructor]);
}
