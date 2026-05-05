import fs from "node:fs/promises";
import path from "node:path";
import { ReviewLayout } from "./components/ReviewLayout";
import type { ReviewData } from "@/lib/types";

async function loadReview(): Promise<ReviewData | null> {
  const file = path.join(process.cwd(), "public", "review.json");
  try {
    const content = await fs.readFile(file, "utf-8");
    return JSON.parse(content) as ReviewData;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const data = await loadReview();

  if (!data) {
    return (
      <div className="h-screen flex items-center justify-center p-8">
        <div className="max-w-lg space-y-4 text-center">
          <h1 className="text-xl font-semibold">No review loaded</h1>
          <p className="text-[var(--color-fg-muted)] leading-relaxed">
            Drop a generated <code className="text-[var(--color-accent)]">review.json</code>{" "}
            file into <code className="text-[var(--color-accent)]">public/</code> and reload
            this page.
          </p>
          <p className="text-sm text-[var(--color-fg-subtle)]">
            See <code>AGENTS.md</code> for instructions on generating a review file from a
            git diff.
          </p>
        </div>
      </div>
    );
  }

  return <ReviewLayout data={data} />;
}
