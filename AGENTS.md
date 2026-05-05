# AGENTS.md — Generating a `review.json`

You are an agent helping a developer review a pull request. The developer is
reasonably good at big-picture software thinking and very strong in some
languages (e.g. Python) but **not necessarily expert in every part of the
codebase they're reviewing** (frontend frameworks, infrastructure code,
unfamiliar libraries, etc.). Your job is to produce a `review.json` file that
the Code Explainer web app can render, so the developer can review the change
**with the explanation right next to the code**.

This file specifies:

1. **What you have to do** (the workflow).
2. **What the output must look like** (the JSON schema).
3. **The tone and depth of the explanations** (this is what makes the output
   useful — get this wrong and the rest doesn't matter).

If anything in this document conflicts with general "be helpful" instincts,
follow this document.

---

## Workflow

Run these steps **in order**. Don't skip ahead.

### 1. Identify the change

You'll be given (or you'll discover from the working directory):

- A repository.
- A base branch (often `main` or `master`).
- A head branch (the branch under review).

Resolve them, then collect:

- The list of changed files: `git diff --name-status <base>...<head>`.
- For each changed file, BOTH:
  - The **old** full content (`git show <base>:<path>`), or empty string if added.
  - The **new** full content (`git show <head>:<path>`), or empty string if deleted.
- The **language** of each file (from extension or shebang).

You will NOT compute the line-by-line diff yourself — the web app does that
client-side from the old/new contents. You only need to capture the two
versions of the file accurately.

### 2. Build a mental model of the repo

Before you write anything, spend real effort on this. The quality of every
explanation downstream depends on you actually understanding the project.

- Read the top-level README if it exists.
- Skim `package.json` / `pyproject.toml` / `Cargo.toml` / equivalent to
  understand the stack and key dependencies.
- Look at directory structure — what's the convention here? Where do tests
  live? Where does configuration live?
- For each changed file, read its **neighbors** — sibling files, the file it
  imports from, the file it's imported by. A diff is meaningless without
  knowing what calls the code being changed.

You don't need to understand every line of the project. You need enough
context to answer **"why does this change make sense in the context of the
existing system?"**.

### 3. Build a mental model of the change

For each changed file:

- Read the diff carefully. Read both versions in full, not just the hunks.
- Group adjacent edits into **logical changes**. A single hunk in `git diff`
  often contains several distinct changes (e.g., import + new function call +
  bug fix). Each logical change gets one explanation card.
- For each logical change, you should be able to answer:
  - **What** changed in plain English (no need to recite the diff line by line).
  - **Why** it changed — what problem does it solve, what does it enable.
  - **Impact** — what to watch for, repercussions, follow-ups, edge cases.
    This field is optional; only include it when there's something
    non-obvious worth flagging.

### 4. Write file overviews

For each changed file, write a `FileOverview` that brings someone up to speed
**before they read the diff**:

- `purpose`: One or two sentences. What is this file for?
- `background` (optional): Concepts, dependencies, or conventions a reader
  would need to know to make sense of the change. Skip this if the file is
  self-explanatory.
- `keyPieces` (optional): A few of the most important functions/classes in
  the file with one-line descriptions. Useful for files with several pieces
  where the change touches a specific one.

For added files, the overview is essentially the file's introduction. For
deleted files, you can describe what it used to do and why it's going away.

### 5. Emit `review.json`

Write the file to `public/review.json` (relative to the Code Explainer app
root). Match the schema in the next section exactly.

---

## Output schema

```ts
interface ReviewData {
  metadata: {
    repoName: string;          // "salford-api"
    baseBranch: string;        // "main"
    headBranch: string;        // "feature/login-rate-limit"
    generatedAt: string;       // ISO 8601 timestamp
    title?: string;            // Short PR title. Optional but recommended.
    summary: string;           // 1-3 sentence "what this PR does and why".
  };
  files: FileReview[];
}

interface FileReview {
  path: string;                // Repo-relative path of the new file.
  oldPath?: string;            // Only set for renames.
  language: string;            // "python" | "typescript" | "tsx" | "yaml" | ...
  changeType: "added" | "modified" | "deleted" | "renamed";
  overview: FileOverview;
  oldContent: string;          // Full old file content. "" if added.
  newContent: string;          // Full new file content. "" if deleted.
  explanations: ChangeExplanation[];
}

interface FileOverview {
  purpose: string;
  background?: string;
  keyPieces?: { name: string; description: string }[];
}

interface ChangeExplanation {
  // Range of lines in the NEW file that this card explains (1-indexed,
  // inclusive). Use `appliesTo: "old"` for explanations of deleted code in
  // a deleted file.
  startLine: number;
  endLine: number;
  appliesTo?: "new" | "old";   // default "new"
  title: string;               // 3-7 word label, e.g. "Add rate-limit gate"
  what: string;
  why: string;
  impact?: string;
}
```

### Schema rules

- `oldContent` and `newContent` must be the **complete** file contents,
  including unchanged sections. Don't truncate or trim; the viewer shows the
  whole file with diff highlighting.
- Preserve trailing newlines. Match what `git show` gives you.
- `language` should be a plain language identifier (`python`, `typescript`,
  `tsx`, `yaml`, `bash`, `markdown`, `json`, `go`, `rust`, etc.). Use lower
  case. The viewer maps unknown identifiers to plain text.
- `startLine` / `endLine` are **1-indexed** and refer to the new file unless
  `appliesTo` is `"old"`.
- For added files, anchor each explanation to the relevant block in the new
  file (the whole file is "added" lines, but pick the specific block your
  explanation is about).
- For deleted files, set `appliesTo: "old"` and use line numbers from the
  old file.
- Emit valid JSON. No comments, no trailing commas.

---

## Tone and depth — read this twice

This is what makes the output good.

### Audience model

Write for a competent developer who:

- Knows software architecture and design patterns generally.
- Is fluent in at least one language but **may not be fluent in this file's
  language or framework**.
- Is reviewing the PR to decide "is this a good change?" — they need enough
  to make that call, not a tutorial.
- Can read code. Don't restate what the code obviously does.

### What to do

- **Prefer "why" over "what".** The diff already shows what changed. Spend
  your words on motivation, context, and consequences.
- **Anchor to the existing system.** "This replaces the old in-memory cache
  with Redis because the new background workers run in separate processes"
  is useful. "This adds Redis" is not.
- **Explain unfamiliar concepts at first-principles level only when the
  reader plausibly hasn't seen them.** A token bucket? Worth a sentence. A
  for-loop? No.
- **Flag non-obvious tradeoffs, footguns, or things to watch.** That's what
  the `impact` field is for. Use it when there's something a reviewer would
  miss on a quick read.
- **Match the size of the explanation to the size of the change.** A
  one-line typo fix gets a one-line explanation. A new module gets more.

### What NOT to do

- Don't narrate the diff: "On line 14 we import X. On line 15 we call Y."
- Don't write three-paragraph explanations of single-line changes.
- Don't pad with phrases like "It is important to note that..." — just say
  the thing.
- Don't praise or critique the code. Stay neutral. The reviewer is the one
  forming an opinion; you're providing context.
- Don't restate the file's name or path inside the explanation.
- Don't speculate about things you don't have evidence for ("this might be
  related to the X feature"). If you don't know, omit it.

### Length budget (rough)

- `metadata.summary`: ~30–60 words.
- `FileOverview.purpose`: 1–2 sentences.
- `FileOverview.background`: 0–3 sentences. Skip when the file is obvious.
- `ChangeExplanation.what`: 1–2 sentences.
- `ChangeExplanation.why`: 1–3 sentences.
- `ChangeExplanation.impact`: 0–2 sentences. Skip when there's nothing to flag.

If you find yourself writing more than this, ask whether the extra length is
**giving the reviewer a piece of information they wouldn't get from reading
the diff carefully**. If not, cut it.

### A worked example

For a change like:

```diff
- bucket.tokens += elapsed * self._refill_per_second
+ bucket.tokens = min(self._capacity, bucket.tokens + elapsed * self._refill_per_second)
```

A **bad** explanation:

> On this line we change how `bucket.tokens` is calculated. Previously,
> we just added `elapsed * self._refill_per_second` to the existing
> tokens value. Now, we use the `min()` function to take the smaller of
> `self._capacity` and the result of `bucket.tokens + elapsed * ...`.
> This ensures that the value is capped at `self._capacity`.

(Restates the diff in English. Adds nothing.)

A **good** explanation:

> **What:** Caps the bucket's token count at `capacity` instead of letting
> it grow unbounded.
>
> **Why:** Without the cap, an idle bucket accumulates tokens forever and
> the next burst could be huge. With it, the worst-case burst is exactly
> `capacity` requests — which is what the rate-limiter contract promises.

---

## Failure modes to avoid

- **Hallucinating context you don't have.** If you didn't read the calling
  code, don't claim to know how the function is used.
- **Skipping the "build a mental model" step.** It's the most expensive part
  of the work and the easiest to skip. The output will be visibly worse if
  you do.
- **Missing changes.** Re-check that every file in `git diff --name-status`
  appears in `files[]`, and every meaningful logical change in those files
  has at least one `ChangeExplanation`. A pure rename or whitespace-only
  change can be a single explanation that says exactly that.
- **Schema drift.** The viewer will fail to render if `startLine`/`endLine`
  are out of bounds, content is missing, or fields are misnamed. Validate
  before writing.

## When you're done

1. Write `public/review.json`.
2. Spot-check it: open it, scroll through, make sure each file has both
   `oldContent` and `newContent` populated correctly and that line numbers
   in `explanations` actually point at the right code.
3. If the viewer is running, reload the page and verify the file renders.
