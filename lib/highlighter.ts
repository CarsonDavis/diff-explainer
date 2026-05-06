import type {
  Highlighter,
  BundledLanguage,
  BundledTheme,
  ThemedToken,
} from "shiki";

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

export type LineToken = Pick<ThemedToken, "content" | "color">;

/**
 * Tokenize a whole file and return one token array per line. Tokens carry
 * their syntax color so the diff viewer can render them with optional
 * intra-line word-diff overlays on top.
 */
export async function highlightToTokens(
  code: string,
  lang: string
): Promise<LineToken[][]> {
  if (!code) return [];
  const highlighter = await getHighlighter();
  const result = highlighter.codeToTokens(code, {
    lang: normalizeLang(lang) as BundledLanguage,
    theme: THEME,
  });
  return result.tokens.map((line) =>
    line.map((t) => ({ content: t.content, color: t.color }))
  );
}
