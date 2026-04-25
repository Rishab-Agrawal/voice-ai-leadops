import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { labelCta, normalizeTranscript } from "@/lib/extract";
import { LeadActions } from "../../LeadActions";

export const dynamic = "force-dynamic";

function pretty(s?: string | null) {
  if (!s) return "—";
  return s.replace(/_/g, " ");
}

function titleCase(s?: string | null) {
  if (!s) return null;
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function when(d?: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

export default async function LeadDetail({ params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: { calls: { orderBy: { createdAt: "desc" } } },
  });
  if (!lead) notFound();

  const call = lead.calls[0];
  let transcript: { role: string; content: string }[] = [];
  if (call?.transcript) {
    try {
      transcript = normalizeTranscript(JSON.parse(call.transcript));
    } catch {
      transcript = normalizeTranscript(call.transcript);
    }
  }
  const outcome = labelCta(lead.ctaOutcome ?? undefined);

  return (
    <div>
      <div className="mb-8 fade-up delay-0">
        <Link
          href="/"
          style={{
            color: "var(--muted)",
            fontSize: "0.68rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          ← Pipeline
        </Link>
        <div className="flex items-start justify-between mt-3">
          <div>
            <div className="eyebrow">
              <span>Lead Profile</span>
              {lead.source && (
                <>
                  <span className="dot" />
                  <span>{lead.source}</span>
                </>
              )}
            </div>
            <h1 style={{ fontSize: "2.6rem", marginBottom: 8 }}>{lead.name}</h1>
            <div
              style={{
                color: "var(--muted)",
                fontSize: "0.85rem",
                display: "flex",
                gap: 14,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span className="mono" style={{ color: "var(--sand-dim)" }}>
                {lead.phone}
              </span>
              <span style={{ color: "var(--muted-soft)" }}>·</span>
              <span
                style={{
                  fontSize: "0.62rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                created {when(lead.createdAt)}
              </span>
            </div>
          </div>
          <LeadActions leadId={lead.id} status={lead.status} />
        </div>
      </div>

      <div className="qual-strip mb-8 fade-up delay-1">
        <QualField label="Status" value={pretty(lead.status)} accent />
        <QualField label="Intent" value={pretty(lead.intent)} accent={!!lead.intent} />
        <QualField
          label="Location"
          value={pretty(lead.locationComfort)}
          accent={!!lead.locationComfort}
        />
        <QualField
          label="Budget"
          value={pretty(lead.budgetRange)}
          accent={!!lead.budgetRange}
        />
        <QualField
          label="Timeline"
          value={pretty(lead.timelineComfort)}
          accent={!!lead.timelineComfort}
        />
      </div>

      <div className="card p-6 mb-6 fade-up delay-2">
        <div className="flex items-center justify-between mb-4">
          <div
            style={{
              fontSize: "0.66rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--gold)",
              fontWeight: 500,
            }}
          >
            Disposition
          </div>
          <span className={`pill ${outcome.color}`}>{outcome.label}</span>
        </div>
        {lead.callbackDay ? (
          <div
            style={{
              color: "var(--sand)",
              fontSize: "0.95rem",
              fontWeight: 400,
              lineHeight: 1.5,
            }}
          >
            Expert callback for{" "}
            <strong style={{ color: "var(--gold)", fontWeight: 600 }}>
              {titleCase(lead.callbackDay)}
            </strong>
            {lead.callbackTime && (
              <>
                {" "}at{" "}
                <strong style={{ color: "var(--gold)", fontWeight: 600 }}>
                  {lead.callbackTime}
                </strong>
              </>
            )}
          </div>
        ) : (
          <div style={{ color: "var(--sand-dim)", fontSize: "0.9rem" }}>
            {lead.ctaOutcome === "not_interested"
              ? "Marked as not interested. Will not be re-dialled."
              : lead.ctaOutcome === "brochure_requested"
                ? "Brochure send queued — Property Expert will follow up."
                : "No follow-up scheduled yet."}
          </div>
        )}
        {lead.notes && (
          <>
            <div className="divider" />
            <div
              style={{
                fontSize: "0.62rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: 6,
              }}
            >
              Internal Notes
            </div>
            <div style={{ color: "var(--sand-dim)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              {lead.notes}
            </div>
          </>
        )}
      </div>

      {call && (
        <div className="card p-6 fade-up delay-3">
          <div className="flex items-center justify-between mb-4">
            <div
              style={{
                fontSize: "0.66rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--gold)",
                fontWeight: 500,
              }}
            >
              Call Record
            </div>
            <div
              className="mono"
              style={{
                color: "var(--muted-soft)",
                fontSize: "0.7rem",
                letterSpacing: "0.04em",
              }}
            >
              {call.executionId && (
                <>
                  {call.executionId.slice(0, 8)}
                  <span style={{ color: "var(--muted-soft)" }}>…</span>
                  {" · "}
                </>
              )}
              {call.duration ? `${call.duration}s · ` : ""}
              {when(call.endedAt || call.createdAt)}
            </div>
          </div>
          {call.summary && (
            <div
              style={{
                padding: "1rem 1.2rem",
                background: "var(--bg-deeper)",
                borderRadius: 6,
                marginBottom: 16,
                borderLeft: "2px solid var(--gold)",
              }}
            >
              <div
                style={{
                  fontSize: "0.6rem",
                  letterSpacing: "0.2em",
                  color: "var(--gold)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Summary
              </div>
              <div
                style={{
                  color: "var(--sand)",
                  fontSize: "0.92rem",
                  lineHeight: 1.55,
                  fontFamily: "var(--font-display)",
                  fontVariationSettings: '"SOFT" 50, "opsz" 144',
                }}
              >
                {call.summary}
              </div>
            </div>
          )}
          {call.recordingUrl && (
            <div className="mb-4">
              <audio controls src={call.recordingUrl} style={{ width: "100%" }} />
            </div>
          )}
          {transcript.length > 0 ? (
            <div className="transcript">
              {transcript.map((t, i) => (
                <div key={i} className="turn">
                  <div className={`role ${t.role === "agent" ? "role-assistant" : ""}`}>
                    {t.role === "agent" ? "Priya" : "Lead"}
                  </div>
                  <div className="turn-content">{t.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              Transcript not available yet.
            </div>
          )}
        </div>
      )}

      {!call && (
        <div
          className="card p-6 fade-up delay-3"
          style={{ color: "var(--muted)", fontSize: "0.92rem", lineHeight: 1.6 }}
        >
          No call placed yet. Hit the phone icon above to trigger Priya, or use the{" "}
          <em style={{ color: "var(--gold)" }}>Demo</em> button (in <span className="mono">?dev=1</span>{" "}
          mode) to inject a synthetic webhook.
        </div>
      )}
    </div>
  );
}

function QualField({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="qual-field">
      <div className="qual-label">{label}</div>
      <div className={`qual-value ${accent ? "" : "dim"}`}>{value}</div>
    </div>
  );
}
