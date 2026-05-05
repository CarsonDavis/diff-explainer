import { diffLines } from "diff";
import type { DiffLine } from "./types";

/**
 * Compute a line-level diff and return one DiffLine per visible row.
 * Old/new line numbers are tracked so explanation cards can anchor to them.
 */
export function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const result: DiffLine[] = [];
  const parts = diffLines(oldContent, newContent);

  let oldNum = 1;
  let newNum = 1;

  for (const part of parts) {
    const lines = part.value.split("\n");
    // The split leaves a trailing empty string when the chunk ends with "\n".
    if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

    if (part.added) {
      for (const line of lines) {
        result.push({ type: "add", newLine: newNum, content: line });
        newNum++;
      }
    } else if (part.removed) {
      for (const line of lines) {
        result.push({ type: "remove", oldLine: oldNum, content: line });
        oldNum++;
      }
    } else {
      for (const line of lines) {
        result.push({
          type: "context",
          oldLine: oldNum,
          newLine: newNum,
          content: line,
        });
        oldNum++;
        newNum++;
      }
    }
  }

  return result;
}
