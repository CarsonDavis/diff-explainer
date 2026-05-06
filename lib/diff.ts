import { diffLines } from "diff";
import type { DiffRow } from "./types";

type Part = { kind: "context" | "removed" | "added"; lines: string[] };

/**
 * Compute side-by-side diff rows. Old/new line numbers are tracked so
 * explanation cards can anchor to a row by its new-file line number.
 *
 * Adjacent (removed, added) blocks are paired sequentially into "modified"
 * rows so corresponding lines align across columns. Leftover lines on the
 * longer side become "remove" or "add" rows after the pairs.
 */
export function computeDiff(oldContent: string, newContent: string): DiffRow[] {
  const parts: Part[] = [];
  for (const p of diffLines(oldContent, newContent)) {
    const lines = p.value.split("\n");
    // The split leaves a trailing empty string when the chunk ends with "\n".
    if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    if (p.added) parts.push({ kind: "added", lines });
    else if (p.removed) parts.push({ kind: "removed", lines });
    else parts.push({ kind: "context", lines });
  }

  const rows: DiffRow[] = [];
  let oldNum = 1;
  let newNum = 1;
  let i = 0;

  while (i < parts.length) {
    const part = parts[i];

    if (part.kind === "context") {
      for (const line of part.lines) {
        rows.push({
          type: "context",
          left: { line: oldNum, content: line },
          right: { line: newNum, content: line },
        });
        oldNum++;
        newNum++;
      }
      i++;
      continue;
    }

    if (part.kind === "removed") {
      const next = parts[i + 1];
      if (next?.kind === "added") {
        const removed = part.lines;
        const added = next.lines;
        const pairs = Math.min(removed.length, added.length);
        for (let j = 0; j < pairs; j++) {
          rows.push({
            type: "modified",
            left: { line: oldNum, content: removed[j] },
            right: { line: newNum, content: added[j] },
          });
          oldNum++;
          newNum++;
        }
        for (let j = pairs; j < removed.length; j++) {
          rows.push({ type: "remove", left: { line: oldNum, content: removed[j] } });
          oldNum++;
        }
        for (let j = pairs; j < added.length; j++) {
          rows.push({ type: "add", right: { line: newNum, content: added[j] } });
          newNum++;
        }
        i += 2;
      } else {
        for (const line of part.lines) {
          rows.push({ type: "remove", left: { line: oldNum, content: line } });
          oldNum++;
        }
        i++;
      }
      continue;
    }

    // part.kind === "added" with no preceding removed
    for (const line of part.lines) {
      rows.push({ type: "add", right: { line: newNum, content: line } });
      newNum++;
    }
    i++;
  }

  return rows;
}
