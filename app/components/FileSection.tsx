"use client";

import { useLayoutEffect, useRef, useState, useCallback, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { DiffViewer, type ActiveRange } from "./DiffViewer";
import { ExplanationCard } from "./ExplanationCard";
import { FileOverview } from "./FileOverview";
import { computeDiffStats } from "@/lib/diff";
import type { FileReview } from "@/lib/types";
import type { HighlightMode } from "@/lib/highlightSettings";
import type { TruncateMode } from "@/lib/diffTruncate";

interface Props {
  file: FileReview;
  /** Zero-based position in the review's file list. */
  fileIndex: number;
  /** Total number of files in the review. */
  fileCount: number;
  /** One color per explanation in this file, in the same order as file.explanations.
   *  Generated globally across the review so colors rotate as you scroll. */
  explanationColors: string[];
  highlightMode: HighlightMode;
  truncateMode: TruncateMode;
  /** When true, render only the file header (cheap) and skip the diff + cards.
   *  Used for progressive top-down rendering of long reviews — files outside the
   *  initial mount window stay deferred until idle-time scheduling reaches them. */
  deferred?: boolean;
}

interface DiffStats {
  adds: number;
  removes: number;
}

const CARD_GAP = 8;

export function FileSection({
  file,
  fileIndex,
  fileCount,
  explanationColors,
  highlightMode,
  truncateMode,
  deferred = false,
}: Props) {
  const [open, setOpen] = useState(true);
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(
    () => new Set()
  );
  const [stats, setStats] = useState<DiffStats | null>(null);

  // When the user collapses this file, pin its header to the top of the
  // viewport. Without this the scroll position stays at the same absolute
  // px, so the file shrinks under the cursor and the page jumps to whatever
  // file was previously several thousand pixels below.
  const wasOpenRef = useRef(open);
  useLayoutEffect(() => {
    if (wasOpenRef.current && !open) {
      document
        .getElementById(`file-${encodePath(file.path)}`)
        ?.scrollIntoView({ block: "start" });
    }
    wasOpenRef.current = open;
  }, [open, file.path]);

  // Compute add/remove stats lazily so even deferred files eventually show
  // their counts without paying the cost on first render.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const ric: (cb: () => void) => number =
      "requestIdleCallback" in window
        ? (cb) => window.requestIdleCallback!(cb)
        : (cb) => window.setTimeout(cb, 0);
    const cic: (id: number) => void =
      "cancelIdleCallback" in window
        ? (id) => window.cancelIdleCallback!(id)
        : (id) => window.clearTimeout(id);
    const id = ric(() => {
      if (cancelled) return;
      setStats(computeDiffStats(file.oldContent, file.newContent));
    });
    return () => {
      cancelled = true;
      cic(id);
    };
  }, [file.oldContent, file.newContent]);

  // Reset expansions whenever the truncate mode flips so toggling between
  // modes always starts from a clean state.
  useEffect(() => {
    setExpandedSegments(new Set());
  }, [truncateMode]);

  const activeRanges: ActiveRange[] =
    highlightMode === "all"
      ? file.explanations.map((exp, i) => ({
          startLine: exp.startLine,
          endLine: exp.endLine,
          color: explanationColors[i],
        }))
      : activeIdx !== null && file.explanations[activeIdx]
      ? [
          {
            startLine: file.explanations[activeIdx].startLine,
            endLine: file.explanations[activeIdx].endLine,
            color: explanationColors[activeIdx],
          },
        ]
      : [];

  // Map from new-file line number → DOM element so we can anchor cards.
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const diffContainerRef = useRef<HTMLDivElement>(null);
  const explanationsContainerRef = useRef<HTMLDivElement>(null);

  const onLineRef = useCallback((newLine: number, el: HTMLDivElement | null) => {
    if (el) lineRefs.current.set(newLine, el);
    else lineRefs.current.delete(newLine);
  }, []);

  const layoutCards = useCallback(() => {
    const diffContainer = diffContainerRef.current;
    const explanationsContainer = explanationsContainerRef.current;
    if (!diffContainer || !explanationsContainer) return;

    // Cards are absolutely positioned inside the explanations column, so the
    // baseline for `top: Npx` must be that column's top — NOT the diff
    // container's, which sits below the overview block.
    const containerTop = explanationsContainer.getBoundingClientRect().top;
    let lastBottom = 0;

    // Sort explanations by anchor line so we stack them top-to-bottom.
    const sorted = [...file.explanations].sort((a, b) => a.startLine - b.startLine);

    for (const exp of sorted) {
      const card = cardRefs.current.get(exp.startLine);
      const lineEl = lineRefs.current.get(exp.startLine);
      if (!card || !lineEl) continue;

      const desiredTop = Math.max(
        lineEl.getBoundingClientRect().top - containerTop,
        lastBottom + CARD_GAP
      );
      card.style.top = `${desiredTop}px`;
      lastBottom = desiredTop + card.offsetHeight;
    }

    // Make the explanations column at least as tall as the stacked cards.
    explanationsContainer.style.minHeight = `${lastBottom + CARD_GAP}px`;
  }, [file.explanations]);

  useLayoutEffect(() => {
    layoutCards();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => layoutCards();
    window.addEventListener("resize", onResize);
    // Re-layout shortly after to account for async syntax highlighting.
    const t1 = setTimeout(layoutCards, 50);
    const t2 = setTimeout(layoutCards, 300);
    const t3 = setTimeout(layoutCards, 1000);

    // Track diff-container height changes (expanded collapse stubs, shiki
    // re-render, etc.) so cards re-anchor whenever rows shift.
    const diffEl = diffContainerRef.current;
    let ro: ResizeObserver | null = null;
    if (diffEl && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => layoutCards());
      ro.observe(diffEl);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      ro?.disconnect();
    };
  }, [layoutCards, deferred]);

  return (
    <section
      id={`file-${encodePath(file.path)}`}
      className="border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
    >
      <FileHeader
        file={file}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        fileIndex={fileIndex}
        fileCount={fileCount}
        stats={stats}
      />

      {deferred && open && (
        <div className="px-3 py-6 text-[12px] text-[var(--color-fg-subtle)] italic">
          Loading…
        </div>
      )}

      {!deferred && open && (
        <div className="grid grid-cols-[1fr_400px] gap-3 p-3">
          {/* LEFT: overview + diff */}
          <div className="min-w-0 space-y-3">
            <button
              type="button"
              onClick={() => setOverviewOpen((o) => !o)}
              className="flex items-center gap-1 text-xs uppercase tracking-wide text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              {overviewOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Overview
            </button>
            {overviewOpen && <FileOverview overview={file.overview} />}

            <div
              ref={diffContainerRef}
              data-tour="diff"
              className="border border-[var(--color-border)] rounded-md overflow-hidden bg-[var(--color-bg)]"
            >
              <DiffViewer
                file={file}
                onLineRef={onLineRef}
                activeRanges={activeRanges}
                truncateMode={truncateMode}
                explanations={file.explanations}
                expandedSegments={expandedSegments}
                onExpandSegment={(segStart) =>
                  setExpandedSegments((s) => {
                    const next = new Set(s);
                    next.add(segStart);
                    return next;
                  })
                }
              />
            </div>
          </div>

          {/* RIGHT: anchored explanation cards */}
          <div ref={explanationsContainerRef} className="relative">
            {file.explanations.map((exp, i) => {
              const isActive = highlightMode === "all" || activeIdx === i;
              return (
                <div
                  key={`${exp.startLine}-${i}`}
                  ref={(el) => {
                    if (el) cardRefs.current.set(exp.startLine, el);
                    else cardRefs.current.delete(exp.startLine);
                  }}
                  style={{ position: "absolute", left: 0, right: 0 }}
                >
                  <ExplanationCard
                    explanation={exp}
                    active={isActive}
                    color={explanationColors[i]}
                    interactive={highlightMode === "single"}
                    onToggle={() => setActiveIdx((cur) => (cur === i ? null : i))}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function FileHeader({
  file,
  open,
  onToggle,
  fileIndex,
  fileCount,
  stats,
}: {
  file: FileReview;
  open: boolean;
  onToggle: () => void;
  fileIndex: number;
  fileCount: number;
  stats: DiffStats | null;
}) {
  const statusColor =
    file.changeType === "added"
      ? "var(--color-status-added)"
      : file.changeType === "deleted"
      ? "var(--color-status-deleted)"
      : file.changeType === "renamed"
      ? "var(--color-status-renamed)"
      : "var(--color-status-modified)";

  return (
    <button
      type="button"
      onClick={onToggle}
      className="sticky top-0 z-20 w-full flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] border-b border-[var(--color-border)] rounded-t-md text-left"
    >
      {open ? (
        <ChevronDown size={14} className="text-[var(--color-fg-muted)]" />
      ) : (
        <ChevronRight size={14} className="text-[var(--color-fg-muted)]" />
      )}
      <span
        className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
        style={{ color: statusColor, border: `1px solid ${statusColor}` }}
      >
        {file.changeType.toUpperCase()}
      </span>
      <span className="font-mono text-sm min-w-0 truncate">
        {file.oldPath && file.oldPath !== file.path && (
          <>
            <span className="text-[var(--color-fg-subtle)] line-through">{file.oldPath}</span>{" "}
            <span className="text-[var(--color-fg-subtle)]">→</span>{" "}
          </>
        )}
        {file.path}
      </span>
      <div className="ml-auto flex items-center gap-3 shrink-0 pl-2">
        {stats && (stats.adds > 0 || stats.removes > 0) && (
          <span className="font-mono text-xs flex items-center gap-1.5">
            <span style={{ color: "var(--color-status-added)" }}>+{stats.adds}</span>
            <span style={{ color: "var(--color-status-deleted)" }}>−{stats.removes}</span>
          </span>
        )}
        <span className="text-xs text-[var(--color-fg-subtle)] tabular-nums">
          {fileIndex + 1} / {fileCount}
        </span>
      </div>
    </button>
  );
}

export function encodePath(path: string): string {
  return path.replace(/[^a-zA-Z0-9-_]/g, "_");
}
