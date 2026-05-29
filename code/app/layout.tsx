import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HackerRank Support Triage Agent",
  description:
    "Live support-triage agent: retrieves grounded corpus snippets and decides reply vs. escalate for each ticket.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The app is light-only; the theme is fixed on <html> (no toggle, no schedule).
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
