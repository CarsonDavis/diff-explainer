// Distinct accent colors used to highlight explanation ranges. Cycled by the
// global (review-wide) order of explanations, so as the reader scrolls down
// the page each card gets a visually distinct color.
export const HIGHLIGHT_PALETTE: readonly string[] = [
  "#4fc3f7", // light blue (matches --color-accent)
  "#a78bfa", // purple
  "#f59e0b", // amber
  "#34d399", // emerald
  "#f472b6", // pink
  "#fb923c", // orange
  "#60a5fa", // blue
  "#facc15", // yellow
];

export function paletteColor(index: number): string {
  return HIGHLIGHT_PALETTE[index % HIGHLIGHT_PALETTE.length];
}
