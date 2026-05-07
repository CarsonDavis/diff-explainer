import type { ChangeExplanation, DiffRow } from "./types";

export type TruncateMode = "truncate" | "full";

export const DEFAULT_TRUNCATE_MODE: TruncateMode = "truncate";

/** localStorage key for persisting the user's truncate-vs-full preference. */
export const TRUNCATE_STORAGE_KEY = "diff-explainer:truncate-mode-v1";

/** How many unchanged rows of context to keep on each side of every shown
 *  region (changes + explanation ranges). Mirrors the GitHub PR default's
 *  effect of giving readers a bit of surrounding code. */
export const DIFF_CONTEXT_SIZE = 10;

export interface CollapseSegment {
  /** Inclusive row index of the first hidden row in the run. */
  start: number;
  /** Inclusive row index of the last hidden row in the run. */
  end: number;
  /** end - start + 1. Stored so the UI doesn't have to recompute. */
  length: number;
}

export interface VisibilityPlan {
  /** One entry per row: true = always visible, false = part of a collapsed run. */
  visible: boolean[];
  /** Each contiguous run of collapsed rows. */
  segments: CollapseSegment[];
}

/**
 * Decide which rows of a diff should be visible by default and which can be
 * collapsed behind a "Show N hidden lines" button.
 *
 * A row is visible if:
 *  - it represents a change (add/remove/modified), or
 *  - its new-file line number falls inside any explanation's range, or
 *  - it sits within `contextSize` rows of either of the above.
 */
export function computeVisibility(
  rows: DiffRow[],
  explanations: ChangeExplanation[],
  contextSize: number = DIFF_CONTEXT_SIZE
): VisibilityPlan {
  const n = rows.length;
  const mustShow = new Array<boolean>(n).fill(false);

  for (let i = 0; i < n; i++) {
    const r = rows[i];
    if (r.type === "add" || r.type === "remove" || r.type === "modified") {
      mustShow[i] = true;
      continue;
    }
    const right = r.right;
    if (!right) continue;
    for (const exp of explanations) {
      if (right.line >= exp.startLine && right.line <= exp.endLine) {
        mustShow[i] = true;
        break;
      }
    }
  }

  const visible = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (!mustShow[i]) continue;
    const lo = Math.max(0, i - contextSize);
    const hi = Math.min(n - 1, i + contextSize);
    for (let j = lo; j <= hi; j++) visible[j] = true;
  }

  const segments: CollapseSegment[] = [];
  let i = 0;
  while (i < n) {
    if (visible[i]) {
      i++;
      continue;
    }
    const start = i;
    while (i < n && !visible[i]) i++;
    const end = i - 1;
    segments.push({ start, end, length: end - start + 1 });
  }

  return { visible, segments };
}
