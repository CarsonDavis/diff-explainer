"use client";

import { useLayoutEffect, useRef, useState, useCallback, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { DiffViewer } from "./DiffViewer";
import { ExplanationCard } from "./ExplanationCard";
import { FileOverview } from "./FileOverview";
import type { FileReview } from "@/lib/types";

interface Props {
  file: FileReview;
}

const CARD_GAP = 8;

export function FileSection({ file }: Props) {
  const [open, setOpen] = useState(true);
  const [overviewOpen, setOverviewOpen] = useState(true);

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
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [layoutCards]);

  return (
    <section
      id={`file-${encodePath(file.path)}`}
      className="border border-[var(--color-border)] rounded-md overflow-hidden bg-[var(--color-bg)]"
    >
      <FileHeader file={file} open={open} onToggle={() => setOpen((o) => !o)} />

      {open && (
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
              className="border border-[var(--color-border)] rounded-md overflow-hidden bg-[var(--color-bg)]"
            >
              <DiffViewer file={file} onLineRef={onLineRef} />
            </div>
          </div>

          {/* RIGHT: anchored explanation cards */}
          <div ref={explanationsContainerRef} className="relative">
            {file.explanations.map((exp, i) => (
              <div
                key={`${exp.startLine}-${i}`}
                ref={(el) => {
                  if (el) cardRefs.current.set(exp.startLine, el);
                  else cardRefs.current.delete(exp.startLine);
                }}
                style={{ position: "absolute", left: 0, right: 0 }}
              >
                <ExplanationCard explanation={exp} />
              </div>
            ))}
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
}: {
  file: FileReview;
  open: boolean;
  onToggle: () => void;
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
      className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] border-b border-[var(--color-border)] text-left"
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
      <span className="font-mono text-sm">
        {file.oldPath && file.oldPath !== file.path && (
          <>
            <span className="text-[var(--color-fg-subtle)] line-through">{file.oldPath}</span>{" "}
            <span className="text-[var(--color-fg-subtle)]">→</span>{" "}
          </>
        )}
        {file.path}
      </span>
    </button>
  );
}

export function encodePath(path: string): string {
  return path.replace(/[^a-zA-Z0-9-_]/g, "_");
}
