import type { Highlighter, BundledLanguage, BundledTheme } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

const SUPPORTED_LANGS: BundledLanguage[] = [
  "python",
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "json",
  "yaml",
  "bash",
  "shell",
  "markdown",
  "css",
  "html",
  "go",
  "rust",
  "java",
  "ruby",
  "php",
  "sql",
  "toml",
  "xml",
  "dockerfile",
  "diff",
];

const THEME: BundledTheme = "dark-plus";

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then((shiki) =>
      shiki.createHighlighter({
        themes: [THEME],
        langs: SUPPORTED_LANGS,
      })
    );
  }
  return highlighterPromise;
}

/**
 * Map a language hint from the review JSON onto a Shiki-supported language.
 * Returns "text" if we don't have a grammar for it (which Shiki handles fine).
 */
export function normalizeLang(lang: string): string {
  const l = lang.toLowerCase().trim();
  const aliases: Record<string, string> = {
    py: "python",
    ts: "typescript",
    js: "javascript",
    sh: "bash",
    md: "markdown",
    yml: "yaml",
    rb: "ruby",
    rs: "rust",
    htm: "html",
  };
  const resolved = aliases[l] ?? l;
  return (SUPPORTED_LANGS as string[]).includes(resolved) ? resolved : "text";
}

/**
 * Highlight a whole file and return one HTML string per line.
 * Empty input returns []. The returned strings are the inner HTML of each
 * `<span class="line">…</span>` Shiki produces — safe to render via
 * dangerouslySetInnerHTML inside a styled container.
 */
export async function highlightToLines(code: string, lang: string): Promise<string[]> {
  if (!code) return [];
  const highlighter = await getHighlighter();
  const html = highlighter.codeToHtml(code, { lang: normalizeLang(lang), theme: THEME });

  // Shiki output looks like:
  // <pre class="shiki ..."><code><span class="line">...</span><span class="line">...</span></code></pre>
  // Split out each line's inner HTML.
  const lineRegex = /<span class="line">([\s\S]*?)<\/span>(?=<span class="line">|<\/code>)/g;
  const lines: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = lineRegex.exec(html)) !== null) {
    lines.push(match[1]);
  }
  return lines;
}
