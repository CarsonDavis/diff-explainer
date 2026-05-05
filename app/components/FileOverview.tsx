import type { FileOverview as FileOverviewData } from "@/lib/types";

interface Props {
  overview: FileOverviewData;
}

export function FileOverview({ overview }: Props) {
  return (
    <div className="border border-[var(--color-border)] rounded-md bg-[var(--color-bg-elevated)] p-4 space-y-3 text-[13px] leading-relaxed">
      <div>
        <div className="text-[11px] uppercase tracking-wide font-semibold text-[var(--color-fg-subtle)] mb-1">
          What this file does
        </div>
        <div className="whitespace-pre-wrap">{overview.purpose}</div>
      </div>
      {overview.background && (
        <div>
          <div className="text-[11px] uppercase tracking-wide font-semibold text-[var(--color-fg-subtle)] mb-1">
            Background
          </div>
          <div className="whitespace-pre-wrap">{overview.background}</div>
        </div>
      )}
      {overview.keyPieces && overview.keyPieces.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide font-semibold text-[var(--color-fg-subtle)] mb-1">
            Key pieces
          </div>
          <ul className="space-y-1">
            {overview.keyPieces.map((p) => (
              <li key={p.name} className="flex gap-2">
                <code className="text-[var(--color-accent)] shrink-0">{p.name}</code>
                <span className="text-[var(--color-fg-muted)]">— {p.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
