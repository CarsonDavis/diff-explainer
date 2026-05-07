import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { ReviewLayout } from "@/app/components/ReviewLayout";
import { listReviewSlugs, reviewsDir } from "@/lib/reviews";
import type { ReviewData } from "@/lib/types";

export async function generateStaticParams() {
  const slugs = await listReviewSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const file = path.join(reviewsDir(), `${slug}.json`);
  let data: ReviewData;
  try {
    const content = await fs.readFile(file, "utf-8");
    data = JSON.parse(content) as ReviewData;
  } catch {
    notFound();
  }
  // Keying by slug forces ReviewLayout to remount when the user navigates
  // from one review to another, so per-review state (selected file,
  // progressive mount counter, expanded segments, etc.) doesn't leak across.
  return <ReviewLayout key={slug} data={data} />;
}
