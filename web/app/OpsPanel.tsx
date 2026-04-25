"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Settings = { autoDial: "true" | "false" };

function PhoneIcon({ size = 13 }: { size?: number }) {
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

/**
 * Operational controls that live in the "All Leads" table toolbar.
 * Renders as inline controls (no card chrome) — the consumer is expected
 * to place this inside another container.
 */
export function OpsPanel({
  settings,
  newLeadsCount,
  showDemo = false,
  onMessage,
}: {
  settings: Settings;
  newLeadsCount: number;
  showDemo?: boolean;
  onMessage?: (msg: string | null, isError: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [autoDial, setAutoDial] = useState(settings.autoDial === "true");

  function setMsg(msg: string | null, isError = false) {
    onMessage?.(msg, isError);
  }

  async function toggleAutoDial() {
    const next = !autoDial;
    setAutoDial(next);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoDial: String(next) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg(next ? "Auto-dial on — every new lead now dials immediately" : "Auto-dial off");
      startTransition(() => router.refresh());
    } catch (e) {
      setAutoDial(!next);
      setMsg(`Failed to toggle: ${e instanceof Error ? e.message : String(e)}`, true);
    }
  }

  async function batchDial() {
    setMsg(null);
    try {
      const res = await fetch("/api/batch-dial", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg(
        `Dialled ${data.ok}/${data.attempted}${
          data.failed ? ` · ${data.failed} failed (likely unverified numbers on trial)` : ""
        }`,
      );
      startTransition(() => router.refresh());
    } catch (e) {
      setMsg(`Batch dial failed: ${e instanceof Error ? e.message : String(e)}`, true);
    }
  }

  async function dropMetaLead() {
    setMsg(null);
    const sample = SAMPLE_META_LEADS[Math.floor(Math.random() * SAMPLE_META_LEADS.length)];
    try {
      const res = await fetch("/api/intake?source=meta_ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sample),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg(
        data.autoDialed
          ? data.callError
            ? `Lead arrived from Meta · auto-dial failed (${data.callError})`
            : `Lead arrived from Meta · auto-dialed`
          : `Lead arrived from Meta · queued (auto-dial off)`,
      );
      startTransition(() => router.refresh());
    } catch (e) {
      setMsg(`Simulate failed: ${e instanceof Error ? e.message : String(e)}`, true);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {showDemo && (
        <button
          onClick={dropMetaLead}
          className="toolbar-btn toolbar-btn-demo"
          disabled={isPending}
          title="Demo aid: simulate a Meta Lead Ads webhook firing with a fake lead payload. In production this fires automatically when a real user submits a Meta ad form."
        >
          <span style={{ fontSize: "0.8rem", lineHeight: 1 }}>▶</span>
          <span>Simulate ad lead</span>
        </button>
      )}
      <button
        onClick={batchDial}
        className="toolbar-btn"
        disabled={isPending || newLeadsCount === 0}
        title={
          newLeadsCount === 0
            ? "No new leads to dial"
            : `Dial ${newLeadsCount} new lead${newLeadsCount === 1 ? "" : "s"} via Bolna`
        }
      >
        <PhoneIcon />
        <span>Dial all new</span>
        <span className="toolbar-count mono">{newLeadsCount}</span>
      </button>
      <button
        onClick={toggleAutoDial}
        className={`toolbar-toggle ${autoDial ? "is-on" : ""}`}
        disabled={isPending}
        title={
          autoDial
            ? "On: every lead arriving via the intake webhook is dialled within the same request. Production SLA: <5 min to first touch."
            : "Off: leads queue with status 'new' and require a manual dial."
        }
        aria-pressed={autoDial}
      >
        <span className="toolbar-toggle-dot" />
        <span>Auto-dial</span>
      </button>
    </div>
  );
}

const SAMPLE_META_LEADS = [
  {
    field_data: [
      { name: "full_name", values: ["Arjun Kapoor"] },
      { name: "phone_number", values: ["+919898989898"] },
      { name: "form_name", values: ["WOW — Interest Form"] },
      { name: "ad_name", values: ["wow_hni_lookalike_q2"] },
    ],
    created_time: new Date().toISOString(),
  },
  {
    field_data: [
      { name: "full_name", values: ["Ananya Rao"] },
      { name: "phone_number", values: ["+919812345678"] },
      { name: "form_name", values: ["WOW — Premium Plots Enquiry"] },
      { name: "ad_name", values: ["wow_retargeting_apr"] },
    ],
    created_time: new Date().toISOString(),
  },
  {
    field_data: [
      { name: "full_name", values: ["Karan Malhotra"] },
      { name: "phone_number", values: ["+919123456789"] },
      { name: "form_name", values: ["WOW — Investor Brochure"] },
      { name: "ad_name", values: ["wow_investor_nri_q2"] },
    ],
    created_time: new Date().toISOString(),
  },
];
