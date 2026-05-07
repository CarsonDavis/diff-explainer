"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { diffWordsWithSpace } from "diff";
import { ChevronsUpDown } from "lucide-react";
import { computeDiff } from "@/lib/diff";
import { computeVisibility } from "@/lib/diffTruncate";
import type { TruncateMode } from "@/lib/diffTruncate";
import { highlightToTokens, type LineToken } from "@/lib/highlighter";
import type { ChangeExplanation, DiffRow, FileReview } from "@/lib/types";

export interface ActiveRange {
  startLine: number;
  endLine: number;
  color: string;
}

interface DiffViewerProps {
  file: FileReview;
  /** Called for each row whose right side has a new-file line number, so the
   *  parent can position explanation cards next to that row. */
  onLineRef?: (newLine: number, el: HTMLDivElement | null) => void;
  /** Each entry produces an accent border around the listed rows. When ranges
   *  overlap on a row, the first matching range's color wins. */
  activeRanges?: ActiveRange[];
  /** "truncate" hides unchanged regions outside the context window (with a
   *  click-to-expand stub); "full" shows every row. */
  truncateMode?: TruncateMode;
  /** Used only when truncateMode === "truncate": rows inside an explanation's
   *  range are always kept visible. */
  explanations?: ChangeExplanation[];
  /** Set of segment-start indices the user has expanded. Owned by the parent
   *  so the parent re-renders (and re-runs its layout effect that anchors the
   *  explanation cards) when expansion changes. */
  expandedSegments?: Set<number>;
  onExpandSegment?: (segStart: number) => void;
}

interface RowHighlight {
  color: string;
  isFirst: boolean;
  isLast: boolean;
}

const EMPTY_SET: Set<number> = new Set();

export function DiffViewer({
  file,
  onLineRef,
  activeRanges,
  truncateMode = "full",
  explanations,
  expandedSegments = EMPTY_SET,
  onExpandSegment,
}: DiffViewerProps) {
  const rows: DiffRow[] = useMemo(
    () => computeDiff(file.oldContent, file.newContent),
    [file.oldContent, file.newContent]
  );

  // Visibility plan: which rows are "must show" + which contiguous runs
  // can be collapsed behind a stub. Recomputed only when the inputs change.
  const plan = useMemo(
    () =>
      truncateMode === "truncate"
        ? computeVisibility(rows, explanations ?? [])
        : null,
    [truncateMode, rows, explanations]
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

  // For each row, decide which active range (if any) covers it.
  // A row is "in range" if its right (new-file) line is within [start, end].
  // Pure-removal rows sandwiched between two in-range rows are also included
  // so the highlight stays visually contiguous.
  const rowHighlights = useMemo<(RowHighlight | null)[]>(() => {
    const result: (RowHighlight | null)[] = new Array(rows.length).fill(null);
    if (!activeRanges || activeRanges.length === 0) return result;

    for (const range of activeRanges) {
      const inRange: boolean[] = rows.map((r) =>
        r.right ? r.right.line >= range.startLine && r.right.line <= range.endLine : false
      );
      const firstIdx = inRange.indexOf(true);
      const lastIdx = inRange.lastIndexOf(true);
      if (firstIdx === -1) continue;
      for (let i = firstIdx; i <= lastIdx; i++) {
        if (!rows[i].right) inRange[i] = true;
      }
      for (let i = firstIdx; i <= lastIdx; i++) {
        if (inRange[i] && result[i] === null) {
          result[i] = {
            color: range.color,
            isFirst: i === firstIdx,
            isLast: i === lastIdx,
          };
        }
      }
    }
    return result;
  }, [rows, activeRanges]);

  // Walk rows in order, emitting either a row item or a single "collapse"
  // item per hidden run.
  type Item =
    | { kind: "row"; index: number }
    | { kind: "collapse"; segStart: number; length: number };
  const items = useMemo<Item[]>(() => {
    if (!plan) return rows.map((_, i) => ({ kind: "row", index: i }));
    const out: Item[] = [];
    const segMap = new Map(plan.segments.map((s) => [s.start, s]));
    let i = 0;
    while (i < rows.length) {
      if (plan.visible[i]) {
        out.push({ kind: "row", index: i });
        i++;
        continue;
      }
      const seg = segMap.get(i);
      if (!seg) {
        out.push({ kind: "row", index: i });
        i++;
        continue;
      }
      if (expandedSegments.has(seg.start)) {
        for (let j = seg.start; j <= seg.end; j++) out.push({ kind: "row", index: j });
      } else {
        out.push({ kind: "collapse", segStart: seg.start, length: seg.length });
      }
      i = seg.end + 1;
    }
    return out;
  }, [plan, rows, expandedSegments]);

  // Side-isolated text selection. With CSS Grid, drag-selecting from one
  // side naturally extends across the row into the other side's cells.
  // We toggle a class on the outer div on mousedown so the not-being-
  // selected side gets `user-select: none`, then clear on mouseup.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const sideEl = target?.closest('[data-side]');
      const side = sideEl?.getAttribute("data-side");
      el.classList.remove("diff-select-left", "diff-select-right");
      if (side === "left") el.classList.add("diff-select-right-disabled");
      else if (side === "right") el.classList.add("diff-select-left-disabled");
    };
    const onUp = () => {
      el.classList.remove(
        "diff-select-left-disabled",
        "diff-select-right-disabled"
      );
    };
    el.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="font-mono text-[13px] leading-[1.5]">
      {items.map((item) =>
        item.kind === "row" ? (
          <DiffRowView
            key={`r-${item.index}`}
            row={rows[item.index]}
            oldTok={oldTok}
            newTok={newTok}
            ready={ready}
            onLineRef={onLineRef}
            highlight={rowHighlights[item.index]}
          />
        ) : (
          <CollapseStub
            key={`c-${item.segStart}`}
            length={item.length}
            onExpand={() => onExpandSegment?.(item.segStart)}
          />
        )
      )}
    </div>
  );
}

function CollapseStub({ length, onExpand }: { length: number; onExpand: () => void }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="w-full text-left flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] text-[12px] text-[var(--color-fg-subtle)] border-y border-[var(--color-border-subtle)]"
    >
      <ChevronsUpDown size={12} />
      Show {length} hidden line{length === 1 ? "" : "s"}
    </button>
  );
}

interface DiffRowViewProps {
  row: DiffRow;
  oldTok: LineToken[][] | null;
  newTok: LineToken[][] | null;
  ready: boolean;
  onLineRef?: (newLine: number, el: HTMLDivElement | null) => void;
  highlight: RowHighlight | null;
}

function DiffRowView({
  row,
  oldTok,
  newTok,
  ready,
  onLineRef,
  highlight,
}: DiffRowViewProps) {
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

  const rightLineNumShadow = highlight
    ? buildShadow({
        color: highlight.color,
        left: true,
        top: highlight.isFirst,
        bottom: highlight.isLast,
      })
    : null;
  const rightCodeShadow = highlight
    ? buildShadow({
        color: highlight.color,
        right: true,
        top: highlight.isFirst,
        bottom: highlight.isLast,
      })
    : null;

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
      <CodeCell html={leftHtml} bg={leftBg} side="left" />
      <LineNumber
        value={row.right?.line}
        bg={rightBg}
        className="border-l border-[var(--color-border)]"
        style={rightLineNumShadow ? { boxShadow: rightLineNumShadow } : undefined}
      />
      <CodeCell
        html={rightHtml}
        bg={rightBg}
        side="right"
        style={rightCodeShadow ? { boxShadow: rightCodeShadow } : undefined}
      />
    </div>
  );
}

function buildShadow(sides: {
  color: string;
  left?: boolean;
  right?: boolean;
  top?: boolean;
  bottom?: boolean;
}): string | null {
  const parts: string[] = [];
  const c = sides.color;
  if (sides.left) parts.push(`inset 2px 0 0 ${c}`);
  if (sides.right) parts.push(`inset -2px 0 0 ${c}`);
  if (sides.top) parts.push(`inset 0 2px 0 ${c}`);
  if (sides.bottom) parts.push(`inset 0 -2px 0 ${c}`);
  return parts.length ? parts.join(", ") : null;
}

function LineNumber({
  value,
  bg,
  className = "",
  style,
}: {
  value?: number;
  bg: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={style}
      className={`shrink-0 text-right pr-2 pl-1 text-[var(--color-fg-subtle)] select-none ${bg} ${className}`}
    >
      {value ?? ""}
    </span>
  );
}

function CodeCell({
  html,
  bg,
  side,
  style,
}: {
  html: string;
  bg: string;
  side: "left" | "right";
  style?: React.CSSProperties;
}) {
  return (
    <span
      data-side={side}
      style={style}
      className={`whitespace-pre-wrap break-words pl-2 pr-4 ${bg}`}
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
