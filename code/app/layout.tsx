import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Three voices, three jobs:
//   Space Grotesk — display headings (the futuristic character lives here)
//   Inter         — body, labels, buttons, data (the legible workhorse)
//   JetBrains Mono — machine facts: ticket numbers, paths, scores, telemetry
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

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
    <html
      lang="en"
      data-theme="light"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
