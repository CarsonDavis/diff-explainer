# Diff Explainer

A side-by-side viewer for code reviews where the explanation lives next to
the diff. Built for reviewers who are strong on big-picture software
thinking but aren't fluent in every part of the codebase they're reviewing.

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

A live demo lives at https://diff-explainer.codebycarson.com — but the
expected way to use this tool is **locally**, on your own PRs. The
deployment pieces in this repo are an example, not the main path.

## How it works

There are two pieces:

1. **An agent** reads your repo + a git diff and produces a `review.json`
   describing the change. The agent is instructed by [`AGENTS.md`](./AGENTS.md)
   — it covers workflow (fetch the diff, build a model of the repo, write
   per-change explanations), the JSON schema, and the tone/depth rules
   that keep explanations useful instead of bloated.
2. **This web app** is a viewer. It scans `public/reviews/*.json`, lists
   each review on the home page, and renders a chosen review at
   `/reviews/<slug>/` — diff and explanations side by side, syntax
   highlighted via Shiki (the same grammars VS Code uses).

The agent is the smart part. The viewer just shows what the agent wrote.

## Run it locally

This is the primary way to use the tool — no AWS, no deploy, no hosting.
You'll need a coding agent (Claude Code, Cursor agent mode, anything that
reads files and writes JSON), Node 20+, and a clone of this repo.

```bash
git clone https://github.com/CarsonDavis/diff-explainer.git
cd diff-explainer
npm install
```

Point your agent at [`AGENTS.md`](./AGENTS.md) and the repo + branches you
want to review. For Claude Code, that looks like:

```bash
claude "Read AGENTS.md. The repo is at <PATH>, base branch <BASE>, head branch <HEAD>. Write the review to public/reviews/<slug>.json."
```

Then start the dev server:

```bash
npm run dev    # http://localhost:3005
```

Drop additional `<slug>.json` files into `public/reviews/` and they show up
on the home page automatically. There's nothing server-side; everything
runs in the browser.

To try it without running the agent, copy in the bundled examples:

```bash
mkdir -p public/reviews
cp examples/*.json public/reviews/
npm run dev
```

The [`examples/`](./examples/) directory has sample `review.json` files you
can study to see what good output looks like.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript, Tailwind CSS v4
- Shiki for syntax highlighting (VS Code grammars + Dark+ theme)
- `diff` for line-level diffing
- AWS CDK + GitHub Actions, only used for the optional public-site deploy

## Project layout

```
app/
  page.tsx                # Home: lists reviews from public/reviews/
  reviews/[slug]/page.tsx # Renders one review (SSG via generateStaticParams)
  components/
    ReviewLayout.tsx      # Three-column shell + sidebar header
    FileTree.tsx          # Collapsible tree with A/M/D/R badges
    FileSection.tsx       # Per-file: header, overview, diff + cards
    DiffViewer.tsx        # Side-by-side diff with intra-line word highlight
    ExplanationCard.tsx   # Single What/Why/Impact card
    FileOverview.tsx      # Per-file purpose / background / key pieces

lib/
  types.ts                # ReviewData / FileReview / DiffRow / etc.
  diff.ts                 # computeDiff(old, new) → DiffRow[]
  fileTree.ts             # buildTree(files) → TreeNode[]
  highlighter.ts          # Shiki singleton + line-by-line tokens
  reviews.ts              # listReviewSlugs / listReviewSummaries

examples/                 # Sample reviews. CI bakes all of them into
                          # public/reviews/ at deploy time.

cdk/                      # Optional: AWS CDK app for hosting a public copy
.github/workflows/        # Optional: GitHub Actions deploy

AGENTS.md                 # Instructions for the generation agent
```

## Customization

- **Theme**: tweak the CSS variables in `app/globals.css` under `@theme`.
- **Languages**: Shiki languages load lazily on first use, so you don't
  have to opt in. Adjust `SUPPORTED_LANGS` in `lib/highlighter.ts` to
  expand the allow-list.
- **Layout proportions**: sidebar is `260px`, explanation column is `400px`,
  both inline grid templates in `ReviewLayout.tsx` and `FileSection.tsx`.

## Optional: deploy your own public copy

Most users never need this — local mode is the supported path. The bits
under [`cdk/`](./cdk/) and [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
are an example of how the live demo is hosted, in case you want to put
your own copy on the public internet.

Nothing in `cdk/` is hardcoded to a particular AWS account or domain — all
site-specific values come from environment variables set at deploy time:

| Variable               | Required | Notes                                                       |
| ---------------------- | -------- | ----------------------------------------------------------- |
| `CDK_DEFAULT_ACCOUNT`  | yes      | Set automatically by AWS CLI/SDK or the deploy workflow     |
| `CDK_DEFAULT_REGION`   | no       | Defaults to `us-east-1` (required for CloudFront)           |
| `SITE_DOMAIN`          | yes      | Apex domain you own a Route 53 hosted zone for              |
| `SITE_SUBDOMAIN`       | no       | Defaults to `diff-explainer.<SITE_DOMAIN>`                  |
| `SITE_GITHUB_ORG`      | yes      | GitHub org/user that owns your fork (auto-set in workflow)  |
| `SITE_GITHUB_REPO`     | yes      | Forked repo name (auto-set in workflow)                     |

To deploy:

1. Bootstrap CDK in your account once: `cdk bootstrap`.
2. From the `cdk/` directory, with your AWS profile active:
   ```bash
   SITE_DOMAIN=example.com SITE_GITHUB_ORG=you SITE_GITHUB_REPO=diff-explainer \
     uv run npx cdk deploy
   ```
   The first deploy creates the GitHub Actions role.
3. Add the role's ARN as an `AWS_ROLE_ARN` repository **secret** on your
   fork.
4. Add `SITE_DOMAIN` (and optionally `SITE_SUBDOMAIN`) as repository
   **variables** on your fork.
5. Push to `main`. The workflow takes over from there — subsequent
   deploys run automatically and don't need your laptop.

## License

MIT.
