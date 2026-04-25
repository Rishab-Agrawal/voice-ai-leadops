import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Divyasree LeadOps — Whispers of the Wind",
  description:
    "AI-powered lead qualification for Whispers of the Wind — Divyasree's ultra-premium villa plot project near Nandi Hills.",
};

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..700,0..100;1,9..144,300..700,0..100&family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={FONT_HREF} rel="stylesheet" />
      </head>
      <body>
        <header
          style={{
            borderBottom: "1px solid var(--border-soft)",
            background: "linear-gradient(180deg, rgba(20,26,30,0.6), rgba(14,19,22,0.4))",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-5">
            <Link href="/" className="flex items-center gap-3 fade-up delay-0">
              <span className="brand-mark">D</span>
              <div>
                <div className="brand-name">Divyasree</div>
                <div className="brand-sub">LeadOps · Q2 2026</div>
              </div>
            </Link>
            <nav className="flex items-center fade-up delay-1">
              <Link href="/leads/new" className="btn btn-primary">
                + New lead
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer
          className="mx-auto max-w-6xl px-6 py-10"
          style={{
            color: "var(--muted-soft)",
            fontSize: "0.66rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            borderTop: "1px solid var(--border-soft)",
            marginTop: "3rem",
          }}
        >
          <span>Divyasree LeadOps · Voice Agent on </span>
          <a href="https://bolna.ai" style={{ color: "var(--gold)" }}>
            Bolna
          </a>
        </footer>
      </body>
    </html>
  );
}
