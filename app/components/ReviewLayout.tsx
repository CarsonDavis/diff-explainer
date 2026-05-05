"use client";

import { useMemo, useState } from "react";
import { GitBranch, FileText } from "lucide-react";
import { FileTree } from "./FileTree";
import { FileSection, encodePath } from "./FileSection";
import { buildTree } from "@/lib/fileTree";
import type { ReviewData } from "@/lib/types";

interface Props {
  data: ReviewData;
}

export function ReviewLayout({ data }: Props) {
  const tree = useMemo(() => buildTree(data.files), [data.files]);
  const [selectedPath, setSelectedPath] = useState<string | null>(
    data.files[0]?.path ?? null
  );

  const handleSelect = (path: string) => {
    setSelectedPath(path);
    const el = document.getElementById(`file-${encodePath(path)}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="grid grid-cols-[260px_1fr] h-screen">
      {/* SIDEBAR */}
      <aside className="bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border)] flex flex-col overflow-hidden">
        <div className="px-3 py-3 border-b border-[var(--color-border)]">
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
        <div className="flex-1 overflow-y-auto">
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
          {data.metadata.title && (
            <h1 className="text-lg font-semibold mb-1">{data.metadata.title}</h1>
          )}
          <p className="text-[13px] text-[var(--color-fg-muted)] leading-relaxed whitespace-pre-wrap">
            {data.metadata.summary}
          </p>
          <div className="text-[11px] text-[var(--color-fg-subtle)] mt-2">
            Generated {new Date(data.metadata.generatedAt).toLocaleString()}
          </div>
        </header>

        <div className="space-y-4">
          {data.files.map((file) => (
            <FileSection key={file.path} file={file} />
          ))}
        </div>
      </main>
    </div>
  );
}
