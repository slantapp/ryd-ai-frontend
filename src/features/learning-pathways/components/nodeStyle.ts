import type { PathNodeState, PathNodeType } from "../types";

/** Warm gold reserved for stars, trophies and rewards. */
export const GOLD = { light: "#FCE3A0", base: "#F5C04A", deep: "#D9902A" };

/** Visual footprint of a node, used by the map for layout maths. */
export function nodeSize(type: PathNodeType, state: PathNodeState): number {
  if (type === "checkpoint") return 80;
  if (type === "chest") return 66;
  return state === "current" ? 72 : 60;
}
