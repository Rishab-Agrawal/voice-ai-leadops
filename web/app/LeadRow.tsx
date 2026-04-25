"use client";

import { useRouter } from "next/navigation";
import { LeadActions } from "./LeadActions";

type Lead = {
  id: string;
  name: string;
  phone: string;
  source: string | null;
  status: string;
  intent: string | null;
  budgetRange: string | null;
};

function pretty(s?: string | null) {
  if (!s) return "—";
  return s.replace(/_/g, " ");
}

export function LeadRow({
  lead,
  showDemo,
  disposition,
}: {
  lead: Lead;
  showDemo: boolean;
  disposition: { label: string; color: string };
}) {
  const router = useRouter();

  function navigate() {
    router.push(`/leads/${lead.id}`);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate();
    }
  }

  return (
    <tr
      onClick={navigate}
      onKeyDown={handleKey}
      role="link"
      tabIndex={0}
      style={{ cursor: "pointer" }}
    >
      <td>
        <div style={{ color: "var(--sand)", fontWeight: 500, fontSize: "0.95rem" }}>
          {lead.name}
        </div>
        <div
          style={{
            color: "var(--muted)",
            fontSize: "0.7rem",
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
            letterSpacing: "0.02em",
          }}
        >
          <span className="mono">{lead.phone}</span>
          {lead.source && (
            <>
              <span style={{ color: "var(--muted-soft)" }}>·</span>
              <span style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: "0.62rem" }}>
                {lead.source}
              </span>
            </>
          )}
        </div>
      </td>
      <td style={{ color: "var(--sand-dim)", textTransform: "capitalize" }}>
        {pretty(lead.intent)}
      </td>
      <td style={{ color: "var(--sand-dim)", textTransform: "capitalize" }}>
        {pretty(lead.budgetRange)}
      </td>
      <td>
        <span className={`pill ${disposition.color}`}>{disposition.label}</span>
      </td>
      <td>
        <LeadActions leadId={lead.id} status={lead.status} showDemo={showDemo} inline />
      </td>
    </tr>
  );
}
