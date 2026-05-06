"use client";

import { ChangeExplanation } from "@/lib/types";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ExplanationCardProps {
  explanation: ChangeExplanation;
  active: boolean;
  /** Accent color for this card's range (border ring when active). */
  color: string;
  /** When false, clicking the card does nothing — used for "highlight all" mode. */
  interactive: boolean;
  onToggle: () => void;
}

export function ExplanationCard({
  explanation,
  active,
  color,
  interactive,
  onToggle,
}: ExplanationCardProps) {
  const [open, setOpen] = useState(true);

  const activeStyle: React.CSSProperties = active
    ? { borderColor: color, boxShadow: `0 0 0 2px ${color}` }
    : {};

  return (
    <div
      data-tour="explanation"
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onToggle : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle();
              }
            }
          : undefined
      }
      style={activeStyle}
      className={`border rounded-md bg-[var(--color-bg-elevated)] overflow-hidden transition-shadow ${
        interactive ? "cursor-pointer" : ""
      } ${active ? "" : "border-[var(--color-border)]"}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="w-full flex items-center gap-1.5 px-3 py-2 hover:bg-[var(--color-bg-hover)] text-left"
      >
        {open ? (
          <ChevronDown size={14} className="text-[var(--color-fg-muted)] shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-[var(--color-fg-muted)] shrink-0" />
        )}
        <span className="text-xs font-mono text-[var(--color-fg-subtle)] shrink-0">
          L{explanation.startLine}
          {explanation.endLine !== explanation.startLine ? `–${explanation.endLine}` : ""}
        </span>
        <span className="text-sm font-medium flex-1 truncate">{explanation.title}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 text-[13px] leading-relaxed">
          <Section label="What" body={explanation.what} />
          <Section label="Why" body={explanation.why} />
          {explanation.impact && <Section label="Impact" body={explanation.impact} />}
        </div>
      )}
    </div>
  );
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide font-semibold text-[var(--color-fg-subtle)] mb-0.5">
        {label}
      </div>
      <div className="text-[var(--color-fg)] whitespace-pre-wrap">{body}</div>
    </div>
  );
}
