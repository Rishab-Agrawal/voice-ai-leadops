"use client";

import Link from "next/link";
import { useState } from "react";
import { LeadRow } from "./LeadRow";
import { OpsPanel } from "./OpsPanel";

type Lead = {
  id: string;
  name: string;
  phone: string;
  source: string | null;
  status: string;
  intent: string | null;
  budgetRange: string | null;
};

type Row = {
  lead: Lead;
  disposition: { label: string; color: string };
};

export function LeadsTableShell({
  rows,
  settings,
  newLeadsCount,
  showDemo,
}: {
  rows: Row[];
  settings: { autoDial: "true" | "false" };
  newLeadsCount: number;
  showDemo: boolean;
}) {
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);

  function handleMessage(text: string | null, isError: boolean) {
    setMsg(text ? { text, isError } : null);
  }

  return (
    <div className="card overflow-hidden">
      <div
        className="px-5 py-3"
        style={{
          borderBottom: "1px solid var(--border-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--muted)",
              fontWeight: 500,
            }}
          >
            All Leads
          </span>
          <span
            className="mono"
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.04em",
              color: "var(--muted-soft)",
            }}
          >
            {rows.length} {rows.length === 1 ? "record" : "records"}
          </span>
        </div>

        <OpsPanel
          settings={settings}
          newLeadsCount={newLeadsCount}
          showDemo={showDemo}
          onMessage={handleMessage}
        />
      </div>

      {msg && (
        <div
          style={{
            padding: "0.7rem 1.25rem",
            background: msg.isError ? "rgba(224, 133, 133, 0.06)" : "var(--gold-bg)",
            borderBottom: "1px solid var(--border-soft)",
            fontSize: "0.78rem",
            color: msg.isError ? "var(--pill-err)" : "var(--gold)",
            letterSpacing: "0.02em",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{msg.text}</span>
          <button
            onClick={() => setMsg(null)}
            aria-label="Dismiss"
            style={{
              background: "transparent",
              border: "none",
              color: "currentColor",
              cursor: "pointer",
              opacity: 0.6,
              fontSize: "1rem",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="p-12 text-center" style={{ color: "var(--muted)" }}>
          No leads yet.{" "}
          <Link href="/leads/new" style={{ color: "var(--gold)" }}>
            Add your first lead
          </Link>{" "}
          to kick off a qualification call with Priya.
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Intent</th>
              <th>Budget</th>
              <th>Disposition</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ lead, disposition }) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                showDemo={showDemo}
                disposition={disposition}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
