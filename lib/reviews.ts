import fs from "node:fs/promises";
import path from "node:path";
import type { ReviewData, ReviewMetadata } from "./types";

export function reviewsDir(): string {
  return path.join(process.cwd(), "public", "reviews");
}

/** Slugs are filenames in `public/reviews/` minus the `.json` suffix. */
export async function listReviewSlugs(): Promise<string[]> {
  try {
    const files = await fs.readdir(reviewsDir());
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
  } catch {
    return [];
  }
}

export interface ReviewSummary {
  slug: string;
  metadata: ReviewMetadata;
  fileCount: number;
}

export async function listReviewSummaries(): Promise<ReviewSummary[]> {
  const slugs = await listReviewSlugs();
  const summaries = await Promise.all(
    slugs.map(async (slug) => {
      const content = await fs.readFile(
        path.join(reviewsDir(), `${slug}.json`),
        "utf-8"
      );
      const data = JSON.parse(content) as ReviewData;
      return {
        slug,
        metadata: data.metadata,
        fileCount: data.files.length,
      };
    })
  );
  // Newest review first.
  summaries.sort((a, b) => b.metadata.generatedAt.localeCompare(a.metadata.generatedAt));
  return summaries;
}
