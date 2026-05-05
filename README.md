# Code Explainer

A side-by-side viewer for code reviews where the explanation lives next to
the diff. Built for reviewers who are strong on big-picture software
thinking but aren't fluent in every part of the codebase they're reviewing.

**Live demo: https://code-explainer.codebycarson.com**

```
┌─────────┬──────────────────────────────┬──────────────────────────┐
│ TREE    │ Diff (full file, highlighted)│ Explanation cards         │
│         │                              │ anchored to changes       │
│ ▼ src   │  10  def authenticate():     │ ┌──────────────────────┐  │
│   auth.py│ 11- old_code()              │ │ L11–13               │  │
│ ▶ tests │ 11+ if not limiter.allow():  │ │ Add rate-limit gate  │  │
│         │ 12+   return 429             │ │                      │  │
│         │                              │ │ Why: prevents brute  │  │
│         │                              │ │ force credential...  │  │
│         │                              │ └──────────────────────┘  │
└─────────┴──────────────────────────────┴──────────────────────────┘
```

## How it works

There are two pieces:

1. **An agent** reads your repo + a git diff and produces a `review.json`
   describing the change. The agent is instructed by [`AGENTS.md`](./AGENTS.md)
   — it covers workflow (fetch the diff, build a model of the repo, write
   per-change explanations), the JSON schema, and the tone/depth rules
   that keep explanations useful instead of bloated.
2. **This web app** is a viewer. It loads `public/review.json`, computes
   line-level diffs client-side, syntax-highlights via Shiki (the same
   highlighter VS Code uses), and renders the three-column layout.

The agent is the smart part. The viewer just shows what the agent wrote.

## Use it on your own PR

You'll need a coding agent — Claude Code, Cursor agent mode, or anything else
that reads files and writes JSON. The agent reads [`AGENTS.md`](./AGENTS.md)
as its instructions.

```bash
git clone https://github.com/CarsonDavis/code-explainer.git
cd code-explainer
npm install
```

Point your agent at `AGENTS.md` and the repo + branches you want to review.
For Claude Code, that looks like:

```bash
claude "Read AGENTS.md. The repo is at <PATH>, base branch <BASE>, head branch <HEAD>. Generate review.json."
```

The agent will write `public/review.json`. Then:

```bash
npm run dev    # http://localhost:3000
```

Drop in a different `public/review.json` and refresh. There's nothing
server-side; everything runs in the browser.

## Examples

The [`examples/`](./examples/) directory has sample `review.json` files you
can swap in. The live site bakes `examples/login-rate-limit.json` into the
build — the same JSON you can study locally to see what good output looks
like.

```bash
cp examples/login-rate-limit.json public/review.json
npm run dev
```

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript, Tailwind CSS v4
- Shiki for syntax highlighting (VS Code grammars + Dark+ theme)
- `diff` for line-level diffing
- AWS CDK + GitHub Actions for the deployed site

## Project layout

```
app/
  page.tsx                # Loads public/review.json at build time
  components/
    ReviewLayout.tsx      # Three-column shell + sidebar header
    FileTree.tsx          # Collapsible tree with A/M/D/R badges
    FileSection.tsx       # Per-file: header, overview, diff + cards
    DiffViewer.tsx        # Full-file diff renderer with line refs
    ExplanationCard.tsx   # Single What/Why/Impact card
    FileOverview.tsx      # Per-file purpose / background / key pieces

lib/
  types.ts                # ReviewData / FileReview / etc.
  diff.ts                 # computeDiff(old, new) → DiffLine[]
  fileTree.ts             # buildTree(files) → TreeNode[]
  highlighter.ts          # Shiki singleton + line-by-line highlight

examples/                 # Public sample reviews. CI bakes one of these
                          # into the deployed build.

cdk/                      # AWS CDK app for the live site
.github/workflows/        # GitHub Actions deploy

AGENTS.md                 # Instructions for the generation agent
```

## Customization

- **Theme**: tweak the CSS variables in `app/globals.css` under `@theme`.
- **Languages**: add to `SUPPORTED_LANGS` in `lib/highlighter.ts`. Shiki's
  full bundled-language list is in its docs.
- **Layout proportions**: sidebar is `260px`, explanation column is `400px`,
  both inline grid templates in `ReviewLayout.tsx` and `FileSection.tsx`.

## Deploying your own copy

The live site at `code-explainer.codebycarson.com` is deployed via the CDK
stack in [`cdk/`](./cdk/) and the workflow in
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). To deploy
your own copy:

1. Edit `cdk/app.py` and `cdk/stacks/code_explainer_stack.py` to point at
   your AWS account, hosted zone, and subdomain.
2. Bootstrap CDK in your account once: `cdk bootstrap`.
3. Run `cdk deploy` from your laptop the first time — this creates the
   GitHub Actions role.
4. Add the role's ARN as an `AWS_ROLE_ARN` repository secret on your fork.
5. Push to `main`. The workflow takes over from there.

## License

MIT.
