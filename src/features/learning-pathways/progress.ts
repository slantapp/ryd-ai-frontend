import type { PathNode, PathNodeState, Pathway } from "./types";

export type PathwayProgress = {
  states: Record<string, PathNodeState>;
  currentNodeId: string | null;
  currentUnitId: string | null;
  completedCount: number;
  totalCount: number;
  percent: number;
};

/** Nodes unlock strictly in order: everything before the first unfinished node is done. */
export function getPathwayProgress(
  pathway: Pathway,
  completed: Record<string, number> = {},
): PathwayProgress {
  const states: Record<string, PathNodeState> = {};
  let currentNodeId: string | null = null;
  let currentUnitId: string | null = null;
  let completedCount = 0;
  let totalCount = 0;

  for (const unit of pathway.units) {
    for (const node of unit.nodes) {
      totalCount += 1;
      if (completed[node.id] && currentNodeId === null) {
        states[node.id] = "completed";
        completedCount += 1;
      } else if (currentNodeId === null) {
        states[node.id] = "current";
        currentNodeId = node.id;
        currentUnitId = unit.id;
      } else {
        states[node.id] = "locked";
      }
    }
  }

  return {
    states,
    currentNodeId,
    currentUnitId,
    completedCount,
    totalCount,
    percent: totalCount ? Math.round((completedCount / totalCount) * 100) : 0,
  };
}

export function findNode(pathway: Pathway, nodeId: string): PathNode | undefined {
  for (const unit of pathway.units) {
    const node = unit.nodes.find((n) => n.id === nodeId);
    if (node) return node;
  }
  return undefined;
}

/** Horizontal offsets (in node widths) that make the path snake left and right. */
const WAVE = [0, 0.75, 1.25, 0.75, 0, -0.75, -1.25, -0.75];

export function waveOffset(index: number): number {
  return WAVE[index % WAVE.length];
}
