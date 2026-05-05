"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from "lucide-react";
import type { TreeNode } from "@/lib/fileTree";
import type { ChangeType } from "@/lib/types";

interface FileTreeProps {
  nodes: TreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export function FileTree({ nodes, selectedPath, onSelect }: FileTreeProps) {
  return (
    <div className="text-sm select-none py-2">
      {nodes.map((node) => (
        <TreeRow
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function TreeRow({ node, depth, selectedPath, onSelect }: TreeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const isFile = node.type === "file";
  const isSelected = isFile && selectedPath === node.path;
  const indent = { paddingLeft: `${8 + depth * 12}px` };

  return (
    <div>
      <button
        type="button"
        onClick={() => (isFile ? onSelect(node.path) : setExpanded((e) => !e))}
        className={`w-full flex items-center gap-1 py-[3px] pr-2 text-left hover:bg-[var(--color-bg-hover)] ${
          isSelected ? "bg-[var(--color-bg-hover)]" : ""
        }`}
        style={indent}
      >
        {isFile ? (
          <span className="w-3" />
        ) : expanded ? (
          <ChevronDown size={12} className="text-[var(--color-fg-muted)]" />
        ) : (
          <ChevronRight size={12} className="text-[var(--color-fg-muted)]" />
        )}

        {isFile ? (
          <FileText size={14} className="text-[var(--color-fg-muted)] shrink-0" />
        ) : expanded ? (
          <FolderOpen size={14} className="text-[var(--color-fg-muted)] shrink-0" />
        ) : (
          <Folder size={14} className="text-[var(--color-fg-muted)] shrink-0" />
        )}

        <span className="truncate flex-1">{node.name}</span>

        {isFile && node.changeType && <ChangeBadge type={node.changeType} />}
      </button>

      {!isFile && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChangeBadge({ type }: { type: Exclude<ChangeType, "unchanged"> }) {
  const map: Record<Exclude<ChangeType, "unchanged">, { letter: string; color: string }> = {
    added: { letter: "A", color: "var(--color-status-added)" },
    modified: { letter: "M", color: "var(--color-status-modified)" },
    deleted: { letter: "D", color: "var(--color-status-deleted)" },
    renamed: { letter: "R", color: "var(--color-status-renamed)" },
  };
  const { letter, color } = map[type];
  return (
    <span className="text-[10px] font-mono font-semibold ml-1" style={{ color }}>
      {letter}
    </span>
  );
}
