import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diff Explainer",
  description: "Understand a pull request — diff and explanation, side by side.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Tell Dark Reader (and similar browser extensions) we already have
            a dark theme so they don't try to invert it. */}
        <meta name="darkreader-lock" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body>{children}</body>
    </html>
  );
}
