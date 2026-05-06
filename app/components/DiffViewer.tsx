"use client";

import { useEffect, useMemo, useState } from "react";
import { diffWordsWithSpace } from "diff";
import { computeDiff } from "@/lib/diff";
import { highlightToTokens, type LineToken } from "@/lib/highlighter";
import type { DiffRow, FileReview } from "@/lib/types";

interface DiffViewerProps {
  file: FileReview;
  /** Called for each row whose right side has a new-file line number, so the
   *  parent can position explanation cards next to that row. */
  onLineRef?: (newLine: number, el: HTMLDivElement | null) => void;
}

export function DiffViewer({ file, onLineRef }: DiffViewerProps) {
  const rows: DiffRow[] = useMemo(
    () => computeDiff(file.oldContent, file.newContent),
    [file.oldContent, file.newContent]
  );

  const [oldTok, setOldTok] = useState<LineToken[][] | null>(null);
  const [newTok, setNewTok] = useState<LineToken[][] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      highlightToTokens(file.oldContent, file.language),
      highlightToTokens(file.newContent, file.language),
    ]).then(([o, n]) => {
      if (!cancelled) {
        setOldTok(o);
        setNewTok(n);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [file.oldContent, file.newContent, file.language]);

  const ready = oldTok !== null && newTok !== null;

  return (
    <div className="font-mono text-[13px] leading-[1.5]">
      {rows.map((row, idx) => (
        <DiffRowView
          key={idx}
          row={row}
          oldTok={oldTok}
          newTok={newTok}
          ready={ready}
          onLineRef={onLineRef}
        />
      ))}
    </div>
  );
}

interface DiffRowViewProps {
  row: DiffRow;
  oldTok: LineToken[][] | null;
  newTok: LineToken[][] | null;
  ready: boolean;
  onLineRef?: (newLine: number, el: HTMLDivElement | null) => void;
}

function DiffRowView({ row, oldTok, newTok, ready, onLineRef }: DiffRowViewProps) {
  const leftTokens =
    ready && row.left && oldTok ? oldTok[row.left.line - 1] : undefined;
  const rightTokens =
    ready && row.right && newTok ? newTok[row.right.line - 1] : undefined;

  // For paired modified rows, compute word-level diff so we can show which
  // tokens within the line actually changed.
  const wordRanges = useMemo(() => {
    if (row.type !== "modified" || !row.left || !row.right) {
      return { left: [] as Range[], right: [] as Range[] };
    }
    return computeWordDiff(row.left.content, row.right.content);
  }, [row]);

  const leftHtml =
    leftTokens != null
      ? renderLine(leftTokens, wordRanges.left, "left")
      : row.left
      ? escapeHtml(row.left.content)
      : "";
  const rightHtml =
    rightTokens != null
      ? renderLine(rightTokens, wordRanges.right, "right")
      : row.right
      ? escapeHtml(row.right.content)
      : "";

  const leftBg =
    row.type === "remove" || row.type === "modified"
      ? "bg-[var(--color-diff-remove-bg)]"
      : row.type === "add"
      ? "bg-[var(--color-diff-blank-bg)]"
      : "";
  const rightBg =
    row.type === "add" || row.type === "modified"
      ? "bg-[var(--color-diff-add-bg)]"
      : row.type === "remove"
      ? "bg-[var(--color-diff-blank-bg)]"
      : "";

  return (
    <div
      ref={(el) => {
        if (row.right && onLineRef) onLineRef(row.right.line, el);
      }}
      data-new-line={row.right?.line ?? ""}
      data-old-line={row.left?.line ?? ""}
      className="grid grid-cols-[3rem_minmax(0,1fr)_3rem_minmax(0,1fr)]"
    >
      <LineNumber value={row.left?.line} bg={leftBg} />
      <CodeCell html={leftHtml} bg={leftBg} />
      <LineNumber
        value={row.right?.line}
        bg={rightBg}
        className="border-l border-[var(--color-border)]"
      />
      <CodeCell html={rightHtml} bg={rightBg} />
    </div>
  );
}

function LineNumber({
  value,
  bg,
  className = "",
}: {
  value?: number;
  bg: string;
  className?: string;
}) {
  return (
    <span
      className={`shrink-0 text-right pr-2 pl-1 text-[var(--color-fg-subtle)] select-none ${bg} ${className}`}
    >
      {value ?? ""}
    </span>
  );
}

function CodeCell({ html, bg }: { html: string; bg: string }) {
  return (
    <span
      className={`whitespace-pre overflow-x-auto pl-2 pr-4 ${bg}`}
      dangerouslySetInnerHTML={{ __html: html.length === 0 ? "&nbsp;" : html }}
    />
  );
}

// ── intra-line word diff ──────────────────────────────────────────────────

interface Range {
  start: number;
  end: number;
}

function computeWordDiff(
  oldLine: string,
  newLine: string
): { left: Range[]; right: Range[] } {
  const parts = diffWordsWithSpace(oldLine, newLine);
  const left: Range[] = [];
  const right: Range[] = [];
  let oldPos = 0;
  let newPos = 0;
  for (const p of parts) {
    const len = p.value.length;
    if (p.removed) {
      left.push({ start: oldPos, end: oldPos + len });
      oldPos += len;
    } else if (p.added) {
      right.push({ start: newPos, end: newPos + len });
      newPos += len;
    } else {
      oldPos += len;
      newPos += len;
    }
  }
  return { left, right };
}

/**
 * Build the HTML for one line: walk Shiki's color tokens and split them at
 * any word-diff boundary so the changed slices can carry a darker bg class.
 */
function renderLine(
  tokens: LineToken[],
  ranges: Range[],
  side: "left" | "right"
): string {
  if (tokens.length === 0) return "";
  const isChanged = (i: number) => {
    for (const r of ranges) if (i >= r.start && i < r.end) return true;
    return false;
  };
  const out: string[] = [];
  let pos = 0;
  for (const tok of tokens) {
    const text = tok.content;
    let i = 0;
    while (i < text.length) {
      const changed = isChanged(pos + i);
      let j = i + 1;
      while (j < text.length && isChanged(pos + j) === changed) j++;
      const piece = escapeHtml(text.slice(i, j));
      const colorAttr = tok.color ? ` style="color:${tok.color}"` : "";
      const classAttr = changed
        ? ` class="${side === "left" ? "diff-word-remove" : "diff-word-add"}"`
        : "";
      out.push(`<span${classAttr}${colorAttr}>${piece}</span>`);
      i = j;
    }
    pos += text.length;
  }
  return out.join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
