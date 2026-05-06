"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GitBranch, FileText, ChevronLeft } from "lucide-react";
import { FileTree } from "./FileTree";
import { FileSection, encodePath } from "./FileSection";
import { SettingsMenu } from "./SettingsMenu";
import { buildTree } from "@/lib/fileTree";
import { paletteColor } from "@/lib/highlightPalette";
import { DEFAULT_HIGHLIGHT_MODE, type HighlightMode } from "@/lib/highlightSettings";
import { hasSeenTour, runTour } from "@/lib/tour";
import type { ReviewData } from "@/lib/types";

interface Props {
  data: ReviewData;
}

export function ReviewLayout({ data }: Props) {
  const tree = useMemo(() => buildTree(data.files), [data.files]);
  const [selectedPath, setSelectedPath] = useState<string | null>(
    data.files[0]?.path ?? null
  );
  const [highlightMode, setHighlightMode] = useState<HighlightMode>(
    DEFAULT_HIGHLIGHT_MODE
  );

  // Progressive top-down rendering: hydrate the first file fully, then bump
  // the count during browser idle time so subsequent files mount one at a
  // time while the user is reading. Keeps the initial hydration tree small
  // (otherwise we hydrate 5,000+ row elements at once and the cards land in
  // the wrong place for a second).
  const [mountedCount, setMountedCount] = useState(1);
  useEffect(() => {
    if (mountedCount >= data.files.length) return;
    const ric: (cb: () => void) => number =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (cb) => (window as Window).requestIdleCallback!(cb)
        : (cb) => window.setTimeout(cb, 50);
    const cic: (id: number) => void =
      typeof window !== "undefined" && "cancelIdleCallback" in window
        ? (id) => (window as Window).cancelIdleCallback!(id)
        : (id) => window.clearTimeout(id);
    const id = ric(() =>
      setMountedCount((c) => Math.min(c + 1, data.files.length))
    );
    return () => cic(id);
  }, [mountedCount, data.files.length]);

  // First-visit auto-tour. Wait long enough for shiki highlighting + card
  // layout to settle so the tour spotlights land on positioned elements.
  useEffect(() => {
    if (hasSeenTour()) return;
    const t = setTimeout(() => runTour(), 800);
    return () => clearTimeout(t);
  }, []);

  // Assign a palette color to each explanation in display order across the
  // whole review, so colors rotate naturally as the reader scrolls down.
  const colorsByFile = useMemo(() => {
    const map = new Map<string, string[]>();
    let counter = 0;
    for (const file of data.files) {
      const colors = file.explanations.map(() => paletteColor(counter++));
      map.set(file.path, colors);
    }
    return map;
  }, [data.files]);

  const handleSelect = (path: string) => {
    setSelectedPath(path);
    // If the user jumps to a file beyond the current mount window, force-mount
    // up through it so the scroll target has real content (not a placeholder).
    const idx = data.files.findIndex((f) => f.path === path);
    if (idx >= 0 && idx + 1 > mountedCount) {
      setMountedCount(idx + 1);
    }
    const el = document.getElementById(`file-${encodePath(path)}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="grid grid-cols-[260px_1fr] h-screen">
      {/* SIDEBAR */}
      <aside className="bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border)] flex flex-col overflow-hidden">
        <div className="px-3 py-3 border-b border-[var(--color-border)]">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[11px] text-[var(--color-fg-subtle)] hover:text-[var(--color-accent)] mb-2"
          >
            <ChevronLeft size={11} />
            All reviews
          </Link>
          <div className="text-xs uppercase tracking-wide text-[var(--color-fg-subtle)] mb-1">
            {data.metadata.repoName}
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-[var(--color-fg-muted)]">
            <GitBranch size={12} />
            <span className="font-mono truncate" title={data.metadata.headBranch}>
              {data.metadata.headBranch}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-fg-subtle)] mt-0.5">
            <span>→</span>
            <span className="font-mono truncate" title={data.metadata.baseBranch}>
              {data.metadata.baseBranch}
            </span>
          </div>
        </div>
        <div data-tour="file-tree" className="flex-1 overflow-y-auto">
          <FileTree nodes={tree} selectedPath={selectedPath} onSelect={handleSelect} />
        </div>
        <div className="px-3 py-2 border-t border-[var(--color-border)] text-[11px] text-[var(--color-fg-subtle)] flex items-center gap-1.5">
          <FileText size={12} />
          {data.files.length} file{data.files.length === 1 ? "" : "s"} changed
        </div>
      </aside>

      {/* MAIN */}
      <main className="overflow-y-auto px-4 py-4">
        <header className="mb-4 pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-start justify-between gap-3">
            <div data-tour="review-summary" className="min-w-0 flex-1">
              {data.metadata.title && (
                <h1 className="text-lg font-semibold mb-1">{data.metadata.title}</h1>
              )}
              <p className="text-[13px] text-[var(--color-fg-muted)] leading-relaxed whitespace-pre-wrap">
                {data.metadata.summary}
              </p>
              <div className="text-[11px] text-[var(--color-fg-subtle)] mt-2">
                Generated {new Date(data.metadata.generatedAt).toLocaleString()}
              </div>
            </div>
            <SettingsMenu
              highlightMode={highlightMode}
              onChange={setHighlightMode}
              onReplayTour={() => runTour()}
            />
          </div>
        </header>

        <div className="space-y-4">
          {data.files.map((file, i) => (
            <FileSection
              key={file.path}
              file={file}
              explanationColors={colorsByFile.get(file.path) ?? []}
              highlightMode={highlightMode}
              deferred={i >= mountedCount}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
