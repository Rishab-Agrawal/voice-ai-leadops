"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function PhoneIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function LeadActions({
  leadId,
  status,
  showDemo = false,
  inline = false,
}: {
  leadId: string;
  status: string;
  showDemo?: boolean;
  /** When true (used inside row context), action clicks stopPropagation. */
  inline?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function stop(e: React.MouseEvent) {
    if (inline) e.stopPropagation();
  }

  async function triggerCall(e: React.MouseEvent) {
    stop(e);
    setLoading("call");
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/call`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  async function simulate(e: React.MouseEvent) {
    stop(e);
    setLoading("sim");
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/simulate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  const canCall = status === "new" || status === "failed";

  return (
    <div className="flex items-center gap-2" onClick={stop}>
      <button
        className="icon-action"
        onClick={triggerCall}
        disabled={!canCall || loading !== null}
        title={canCall ? "Call this lead with Priya" : "Already contacted"}
        aria-label="Call lead"
      >
        {loading === "call" ? <span style={{ fontSize: 12 }}>…</span> : <PhoneIcon size={16} />}
      </button>
      {showDemo && (
        <button
          className="btn btn-ghost"
          style={{ padding: "4px 10px", opacity: 0.7 }}
          onClick={simulate}
          disabled={loading !== null}
          title="Demo aid: inject a fake post-call webhook so you can see a populated lead state without placing a real call. In production this would not exist."
        >
          {loading === "sim" ? "…" : "Demo"}
        </button>
      )}
      {error && (
        <span className="pill pill-err" title={error}>
          err
        </span>
      )}
    </div>
  );
}
