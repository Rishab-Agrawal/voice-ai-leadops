"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewLeadPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("website");
  const [notes, setNotes] = useState("");
  const [callNow, setCallNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, source, notes, callNow }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      router.push(`/leads/${data.lead.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8 fade-up delay-0">
        <div className="eyebrow">
          <span>Manual Intake</span>
          <span className="dot" />
          <span>VIP / Walk-in Override</span>
        </div>
        <h1 style={{ fontSize: "2.4rem", marginBottom: 8 }}>Add a new lead</h1>
        <p style={{ color: "var(--sand-dim)", fontSize: "0.92rem", maxWidth: "48ch", lineHeight: 1.55 }}>
          Priya calls this number, qualifies them across four checkpoints, and surfaces
          the captured data on the pipeline.
        </p>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <div>
          <label>Full name</label>
          <input
            required
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aarav Mehra"
          />
        </div>
        <div>
          <label>Phone (E.164)</label>
          <input
            required
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+919876543210"
            pattern="^\+[1-9]\d{6,14}$"
          />
          <div style={{ color: "var(--muted)", fontSize: "0.72rem", marginTop: 4 }}>
            Must start with + and country code. Trial accounts can only call verified numbers.
          </div>
        </div>
        <div>
          <label>Source</label>
          <select className="select" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="website">Website</option>
            <option value="meta_ads">Meta Ads</option>
            <option value="google_ads">Google Ads</option>
            <option value="99acres">99acres</option>
            <option value="magicbricks">MagicBricks</option>
            <option value="referral">Referral</option>
            <option value="walk_in">Walk-in</option>
          </select>
        </div>
        <div>
          <label>Internal notes (optional)</label>
          <textarea
            className="textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Downloaded brochure via Instagram ad on April 22"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="callNow"
            checked={callNow}
            onChange={(e) => setCallNow(e.target.checked)}
          />
          <label htmlFor="callNow" style={{ margin: 0, color: "var(--sand)" }}>
            Trigger Priya to call immediately after creation
          </label>
        </div>

        {error && <div className="pill pill-err">{error}</div>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : "Save lead"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.push("/")}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
