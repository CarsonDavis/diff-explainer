import Link from "next/link";
import { GitBranch, FileText } from "lucide-react";
import { listReviewSummaries } from "@/lib/reviews";

export default async function HomePage() {
  const reviews = await listReviewSummaries();

  if (reviews.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center p-8">
        <div className="max-w-lg space-y-4 text-center">
          <h1 className="text-xl font-semibold">No reviews loaded</h1>
          <p className="text-[var(--color-fg-muted)] leading-relaxed">
            Drop one or more generated review files into{" "}
            <code className="text-[var(--color-accent)]">public/reviews/</code>{" "}
            and reload.
          </p>
          <p className="text-sm text-[var(--color-fg-subtle)]">
            See <code>AGENTS.md</code> for instructions on generating a review file
            from a git diff.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Code Explainer</h1>
          <p className="text-[var(--color-fg-muted)] text-[14px] leading-relaxed">
            {reviews.length} review{reviews.length === 1 ? "" : "s"} available.
            Pick one to view its diff and explanations side by side.
          </p>
        </header>

        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/reviews/${r.slug}/`}
                className="block border border-[var(--color-border)] rounded-md bg-[var(--color-bg-elevated)] hover:border-[var(--color-accent)] transition-colors p-4"
              >
                <div className="text-xs uppercase tracking-wide text-[var(--color-fg-subtle)] mb-1">
                  {r.metadata.repoName}
                </div>
                <h2 className="text-[15px] font-medium mb-2">
                  {r.metadata.title ?? r.slug}
                </h2>
                <p className="text-[13px] text-[var(--color-fg-muted)] leading-relaxed line-clamp-3 mb-3">
                  {r.metadata.summary}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-[var(--color-fg-subtle)]">
                  <span className="flex items-center gap-1">
                    <GitBranch size={11} />
                    <span className="font-mono">{r.metadata.headBranch}</span>
                    <span>→</span>
                    <span className="font-mono">{r.metadata.baseBranch}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={11} />
                    {r.fileCount} file{r.fileCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    {new Date(r.metadata.generatedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
