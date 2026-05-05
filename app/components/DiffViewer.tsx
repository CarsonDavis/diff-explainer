"use client";

import { useEffect, useMemo, useState } from "react";
import { computeDiff } from "@/lib/diff";
import { highlightToLines } from "@/lib/highlighter";
import type { DiffLine, FileReview } from "@/lib/types";

interface DiffViewerProps {
  file: FileReview;
  /** Called for each line so the parent can position explanations next to it. */
  onLineRef?: (newLine: number, el: HTMLDivElement | null) => void;
}

export function DiffViewer({ file, onLineRef }: DiffViewerProps) {
  const lines: DiffLine[] = useMemo(
    () => computeDiff(file.oldContent, file.newContent),
    [file.oldContent, file.newContent]
  );

  const [oldHl, setOldHl] = useState<string[] | null>(null);
  const [newHl, setNewHl] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      highlightToLines(file.oldContent, file.language),
      highlightToLines(file.newContent, file.language),
    ]).then(([o, n]) => {
      if (!cancelled) {
        setOldHl(o);
        setNewHl(n);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [file.oldContent, file.newContent, file.language]);

  const ready = oldHl !== null && newHl !== null;

  return (
    <div className="font-mono text-[13px] leading-[1.5]">
      {lines.map((line, idx) => (
        <DiffRow
          key={idx}
          line={line}
          oldHl={oldHl}
          newHl={newHl}
          ready={ready}
          onLineRef={onLineRef}
        />
      ))}
    </div>
  );
}

interface DiffRowProps {
  line: DiffLine;
  oldHl: string[] | null;
  newHl: string[] | null;
  ready: boolean;
  onLineRef?: (newLine: number, el: HTMLDivElement | null) => void;
}

function DiffRow({ line, oldHl, newHl, ready, onLineRef }: DiffRowProps) {
  // For removed lines, pull highlight from the old file (1-indexed).
  // For context/added, pull from the new file.
  let html = "";
  if (ready) {
    if (line.type === "remove" && line.oldLine != null && oldHl) {
      html = oldHl[line.oldLine - 1] ?? escapeHtml(line.content);
    } else if (line.newLine != null && newHl) {
      html = newHl[line.newLine - 1] ?? escapeHtml(line.content);
    } else {
      html = escapeHtml(line.content);
    }
  } else {
    html = escapeHtml(line.content);
  }

  const bg =
    line.type === "add"
      ? "bg-[var(--color-diff-add-bg)]"
      : line.type === "remove"
      ? "bg-[var(--color-diff-remove-bg)]"
      : "";

  const sign = line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
  const signColor =
    line.type === "add"
      ? "text-[var(--color-status-added)]"
      : line.type === "remove"
      ? "text-[var(--color-status-deleted)]"
      : "text-[var(--color-fg-subtle)]";

  return (
    <div
      ref={(el) => {
        if (line.newLine != null && onLineRef) onLineRef(line.newLine, el);
      }}
      data-new-line={line.newLine ?? ""}
      data-old-line={line.oldLine ?? ""}
      className={`flex ${bg} hover:bg-[var(--color-bg-hover)]/40`}
    >
      <LineNumber value={line.oldLine} />
      <LineNumber value={line.newLine} />
      <span className={`w-4 shrink-0 text-center ${signColor}`}>{sign}</span>
      <span
        className="whitespace-pre flex-1 pr-4"
        // Shiki output is sanitized HTML; line-level fragments are safe.
        dangerouslySetInnerHTML={{ __html: html.length === 0 ? "&nbsp;" : html }}
      />
    </div>
  );
}

function LineNumber({ value }: { value?: number }) {
  return (
    <span className="w-12 shrink-0 text-right pr-3 text-[var(--color-fg-subtle)] select-none">
      {value ?? ""}
    </span>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
