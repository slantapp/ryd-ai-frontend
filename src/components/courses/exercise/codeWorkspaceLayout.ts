/** Vertical split: [editor %, console/results %] — editor gets priority on mobile. */
export function editorConsoleSplitSizes(isMobile: boolean): [number, number] {
  return isMobile ? [72, 28] : [58, 42];
}

/** react-split min heights: [editor px, console px]. */
export function editorConsoleMinSizes(isMobile: boolean): [number, number] {
  return isMobile ? [160, 72] : [120, 100];
}
