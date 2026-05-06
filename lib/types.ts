export type ChangeType = "added" | "modified" | "deleted" | "renamed" | "unchanged";

export interface ReviewMetadata {
  repoName: string;
  baseBranch: string;
  headBranch: string;
  generatedAt: string;
  title?: string;
  summary: string;
}

export interface FileOverview {
  /** First-principles introduction to what this file is for. */
  purpose: string;
  /** Optional background to bring the reader up to speed (concepts, dependencies). */
  background?: string;
  /** Optional list of key functions/symbols and a one-line description each. */
  keyPieces?: { name: string; description: string }[];
}

export interface ChangeExplanation {
  /**
   * Line range this explanation applies to, expressed in the NEW file's
   * line numbers (1-indexed, inclusive). For deleted files, use the OLD line
   * numbers and set `appliesTo` to "old".
   */
  startLine: number;
  endLine: number;
  appliesTo?: "new" | "old";
  /** A short label that surfaces in the panel header, e.g. "Add rate limiter". */
  title: string;
  /** What changed. Plain-English summary of the diff. */
  what: string;
  /** Why it changed — motivation, context, what it fixes/enables. */
  why: string;
  /** Why it matters — repercussions, follow-ups, things to watch for. */
  impact?: string;
}

export interface FileReview {
  /** Repo-relative path for the file in its current (new) location. */
  path: string;
  /** Previous path if renamed; otherwise omit. */
  oldPath?: string;
  /** Hint for syntax highlighting, e.g. "python", "tsx", "yaml". */
  language: string;
  changeType: Exclude<ChangeType, "unchanged">;
  overview: FileOverview;
  /** Full content of the old version. Empty string for added files. */
  oldContent: string;
  /** Full content of the new version. Empty string for deleted files. */
  newContent: string;
  /** Anchored explanations for sections of the change. */
  explanations: ChangeExplanation[];
}

export interface ReviewData {
  metadata: ReviewMetadata;
  files: FileReview[];
}

/** One rendered row in the side-by-side diff. */
export interface DiffRow {
  /**
   * - "context": same line on both sides
   * - "modified": paired remove+add (both sides present, different content)
   * - "add": only right side (new line)
   * - "remove": only left side (old line)
   */
  type: "context" | "modified" | "add" | "remove";
  left?: { line: number; content: string };
  right?: { line: number; content: string };
}
