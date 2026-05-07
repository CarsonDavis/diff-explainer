"use client";

import { useEffect, useRef, useState } from "react";
import { Settings, PlayCircle } from "lucide-react";
import type { HighlightMode } from "@/lib/highlightSettings";
import type { TruncateMode } from "@/lib/diffTruncate";

interface Props {
  highlightMode: HighlightMode;
  onChange: (mode: HighlightMode) => void;
  truncateMode: TruncateMode;
  onTruncateChange: (mode: TruncateMode) => void;
  onReplayTour?: () => void;
}

export function SettingsMenu({
  highlightMode,
  onChange,
  truncateMode,
  onTruncateChange,
  onReplayTour,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        aria-expanded={open}
        data-tour="settings"
        className="p-1.5 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-hover)]"
      >
        <Settings size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-72 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-md shadow-lg z-30 p-3 text-[13px]"
        >
          <div className="text-[11px] uppercase tracking-wide font-semibold text-[var(--color-fg-subtle)] mb-2">
            Code highlighting
          </div>
          <Option
            label="Click to highlight one"
            description="Click an explanation to outline its code. Click again to clear."
            checked={highlightMode === "single"}
            onSelect={() => onChange("single")}
          />
          <Option
            label="Highlight all at once"
            description="Every explanation outlines its code, with a different color per card."
            checked={highlightMode === "all"}
            onSelect={() => onChange("all")}
          />

          <div className="border-t border-[var(--color-border)] my-2" />
          <div className="text-[11px] uppercase tracking-wide font-semibold text-[var(--color-fg-subtle)] mb-2">
            File contents
          </div>
          <Option
            name="truncate-mode"
            label="Show only the diff"
            description="Hide unchanged code far from any change. Click a stub to expand."
            checked={truncateMode === "truncate"}
            onSelect={() => onTruncateChange("truncate")}
          />
          <Option
            name="truncate-mode"
            label="Show full file"
            description="Render every line, including unchanged sections."
            checked={truncateMode === "full"}
            onSelect={() => onTruncateChange("full")}
          />

          {onReplayTour && (
            <>
              <div className="border-t border-[var(--color-border)] my-2" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onReplayTour();
                }}
                className="w-full flex items-center gap-2 py-1.5 px-1 rounded hover:bg-[var(--color-bg-hover)] text-left"
              >
                <PlayCircle size={14} className="text-[var(--color-fg-muted)] shrink-0" />
                <span className="font-medium text-[var(--color-fg)]">Replay tour</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Option({
  label,
  description,
  checked,
  onSelect,
  name = "highlight-mode",
}: {
  label: string;
  description: string;
  checked: boolean;
  onSelect: () => void;
  name?: string;
}) {
  return (
    <label className="flex gap-2 items-start py-1.5 px-1 rounded hover:bg-[var(--color-bg-hover)] cursor-pointer">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-1 accent-[var(--color-accent)]"
      />
      <div className="flex-1">
        <div className="font-medium text-[var(--color-fg)]">{label}</div>
        <div className="text-[12px] text-[var(--color-fg-muted)] leading-snug">
          {description}
        </div>
      </div>
    </label>
  );
}
