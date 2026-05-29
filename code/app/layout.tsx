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
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
