import Link from "next/link";
import { prisma } from "@/lib/db";
import { LeadRow } from "./LeadRow";
import { LeadsTableShell } from "./LeadsTableShell";
import { getAllSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function disposition(lead: { status: string; ctaOutcome: string | null }): {
  label: string;
  color: string;
} {
  if (lead.status === "completed") {
    switch (lead.ctaOutcome) {
      case "call_booked":
        return { label: "Call booked", color: "pill-ok" };
      case "brochure_requested":
        return { label: "Brochure sent", color: "pill-info" };
      case "callback_requested":
        return { label: "Callback", color: "pill-warn" };
      case "not_interested":
        return { label: "Not interested", color: "pill-err" };
      default:
        return { label: "Completed", color: "pill-ok" };
    }
  }
  if (lead.status === "queued") return { label: "Queued", color: "pill-info" };
  if (lead.status === "in_progress") return { label: "In progress", color: "pill-warn" };
  if (lead.status === "failed") return { label: "Failed", color: "pill-err" };
  return { label: "New", color: "" };
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { dev?: string };
}) {
  const showDemo = searchParams?.dev === "1";

  const [leads, settings] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      include: { calls: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    getAllSettings(),
  ]);

  const total = leads.length;
  const contacted = leads.filter((l) => l.status !== "new").length;
  const qualified = leads.filter(
    (l) => l.ctaOutcome === "call_booked" || l.ctaOutcome === "brochure_requested",
  ).length;
  const booked = leads.filter((l) => l.ctaOutcome === "call_booked").length;
  const newCount = leads.filter((l) => l.status === "new").length;

  const rows = leads.map((l) => ({
    lead: l,
    disposition: disposition(l),
  }));

  return (
    <div>
      <div className="mb-10">
        <div className="eyebrow fade-up delay-0">
          <span>Whispers of the Wind</span>
          <span className="dot" />
          <span>North Bengaluru</span>
          <span className="dot" />
          <span>Q2 2026</span>
        </div>
        <h1 className="fade-up delay-1" style={{ fontSize: "3rem", marginBottom: 8 }}>
          Lead Pipeline
        </h1>
        <p
          className="fade-up delay-2"
          style={{
            color: "var(--sand-dim)",
            fontSize: "0.95rem",
            maxWidth: "52ch",
            lineHeight: 1.55,
          }}
        >
          Inbound leads route through Priya, our voice qualification agent. She runs a
          two-minute call, captures intent, and surfaces only the warm prospects for
          Property Expert handoff.
        </p>
      </div>

      <div className="stats-wrap mb-10">
        <div className="stats">
          <Stat label="Total leads" value={total} delay={2} />
          <Stat label="Contacted" value={contacted} hint={pct(contacted, total)} delay={3} />
          <Stat
            label="Qualified"
            value={qualified}
            hint={pct(qualified, total)}
            accent
            delay={4}
          />
          <Stat label="Expert calls booked" value={booked} accent delay={5} />
        </div>
      </div>

      <div className="fade-up delay-6">
        <LeadsTableShell
          rows={rows}
          settings={settings}
          newLeadsCount={newCount}
          showDemo={showDemo}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
  delay = 0,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <div className={`stat fade-up delay-${delay}`}>
      <div className="stat-label">
        <span className={`marker ${accent ? "" : "dim"}`} />
        <span>{label}</span>
      </div>
      <div className={`stat-value ${accent ? "accent" : ""}`}>{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

function pct(n: number, d: number) {
  if (d === 0) return "—";
  return `${Math.round((n / d) * 100)}% of total`;
}
