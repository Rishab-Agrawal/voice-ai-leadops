// Post-call extraction of qualification data from a transcript.
// We prefer Bolna's extracted_data block if present, otherwise we run
// lightweight heuristics on the raw transcript. The agent is scripted to
// ask each checkpoint in a predictable order, which makes this tractable.

export type Intent = "self_use" | "investment" | "both" | "unclear";
export type LocationComfort = "comfortable" | "hesitant" | "prefers_other_area";
export type BudgetRange = "fits" | "below" | "above" | "undisclosed";
export type TimelineComfort = "comfortable" | "wants_sooner" | "unsure";
export type CtaOutcome =
  | "call_booked"
  | "brochure_requested"
  | "callback_requested"
  | "not_interested";

export interface Qualification {
  intent?: Intent;
  locationComfort?: LocationComfort;
  budgetRange?: BudgetRange;
  timelineComfort?: TimelineComfort;
  ctaOutcome?: CtaOutcome;
  callbackDay?: string;
  callbackTime?: string;
}

export interface TranscriptTurn {
  role: "agent" | "user" | string;
  content: string;
}

/**
 * Parse Bolna's transcript field. Bolna returns this in a few shapes across
 * payload versions — be permissive.
 */
export function normalizeTranscript(raw: unknown): TranscriptTurn[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((t) => {
        if (typeof t === "string") return { role: "unknown", content: t };
        if (t && typeof t === "object") {
          const obj = t as Record<string, unknown>;
          const role =
            (obj.role as string) ||
            (obj.speaker as string) ||
            (obj.from as string) ||
            "unknown";
          const content =
            (obj.content as string) ||
            (obj.text as string) ||
            (obj.message as string) ||
            "";
          return { role: roleLabel(role), content: String(content) };
        }
        return { role: "unknown", content: String(t) };
      })
      .filter((t) => t.content);
  }
  if (typeof raw === "string") {
    // Try to parse a plain-text transcript formatted like "agent: ... \nuser: ..."
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return lines.map((line) => {
      const m = line.match(/^(agent|assistant|priya|bot|user|caller|human)\s*[:>-]\s*(.*)$/i);
      if (m) return { role: roleLabel(m[1]), content: m[2] };
      return { role: "unknown", content: line };
    });
  }
  return [];
}

function roleLabel(r: string): "agent" | "user" {
  const lower = r.toLowerCase();
  if (["agent", "assistant", "priya", "bot", "ai"].includes(lower)) return "agent";
  return "user";
}

/**
 * If Bolna's extracted_data block is present, map it into our qualification shape.
 * Bolna returns: { extracted_data: { "Category": { "var_name": { subjective, objective } } } }
 */
export function fromBolnaExtractedData(extracted: unknown): Qualification {
  if (!extracted || typeof extracted !== "object") return {};
  const q: Qualification = {};
  const walk = (obj: Record<string, unknown>) => {
    for (const [key, val] of Object.entries(obj)) {
      if (val && typeof val === "object") {
        const inner = val as Record<string, unknown>;
        if ("objective" in inner) {
          const v = String(inner.objective || "").trim();
          if (!v) continue;
          const k = key.toLowerCase();
          if (k === "intent" && isIntent(v)) q.intent = v;
          else if (k === "location_comfort" && isLocation(v)) q.locationComfort = v;
          else if (k === "budget_range" && isBudget(v)) q.budgetRange = v;
          else if (k === "timeline_comfort" && isTimeline(v)) q.timelineComfort = v;
          else if (k === "cta_outcome" && isCta(v)) q.ctaOutcome = v;
        } else {
          walk(inner);
        }
      }
    }
  };
  walk(extracted as Record<string, unknown>);
  return q;
}

/**
 * Fallback heuristic: scan transcript lines to classify each checkpoint.
 * Deterministic, no LLM call required. Good enough for the demo flow where
 * Priya asks each checkpoint in a scripted way.
 */
export function extractFromTranscript(turns: TranscriptTurn[]): Qualification {
  const result: Qualification = {};
  const joined = turns.map((t) => `${t.role}: ${t.content}`).join("\n");
  const userText = turns
    .filter((t) => t.role === "user")
    .map((t) => t.content.toLowerCase())
    .join(" | ");

  // Intent
  if (/\b(invest(ment|ing)?|portfolio|appreciation|resale|rental yield)\b/.test(userText)) {
    if (/\b(personal|self|family|live|retire|weekend)\b/.test(userText)) result.intent = "both";
    else result.intent = "investment";
  } else if (/\b(personal|self|family|live|retire|weekend|retreat|second home)\b/.test(userText)) {
    result.intent = "self_use";
  } else if (/\b(both|either|mix|combination)\b/.test(userText)) {
    result.intent = "both";
  }

  // Location comfort
  if (/\b(south bengaluru|whitefield|sarjapur|electronic city|jp nagar|not interested in north|bit far)\b/.test(userText)) {
    result.locationComfort = "prefers_other_area";
  } else if (/\b(yes.*(know|familiar)|nandi hills.*beautiful|been there|visited)\b/.test(userText)) {
    result.locationComfort = "comfortable";
  } else if (/\b(how far|airport|traffic|connectivity|not sure|never been)\b/.test(userText)) {
    result.locationComfort = "hesitant";
  }

  // Budget
  if (/\b(works|fits|within|that's fine|okay|sounds good|that works|yes.*budget)\b/.test(userText)) {
    result.budgetRange = "fits";
  } else if (/\b(bit high|too expensive|too much|above my|higher than|out of range)\b/.test(userText)) {
    result.budgetRange = "below";
  } else if (/\b(looking for bigger|premium|three crore|larger plot|villa|top end)\b/.test(userText)) {
    result.budgetRange = "above";
  }

  // Timeline
  if (/\b(2029.*fine|that's good|long enough|happy with|works for me|no rush)\b/.test(userText)) {
    result.timelineComfort = "comfortable";
  } else if (/\b(earlier|sooner|need.*earlier|faster|before 2029|2027|2028)\b/.test(userText)) {
    result.timelineComfort = "wants_sooner";
  } else if (/\b(not sure|depends|we'll see|hmm)\b/.test(userText)) {
    result.timelineComfort = "unsure";
  }

  // CTA outcome
  if (/\b(call|schedule|book|property expert|sure, set up|yes.*call me)\b/.test(userText)) {
    result.ctaOutcome = "call_booked";
  } else if (/\b(whatsapp|brochure|pdf|send.*details|email me)\b/.test(userText)) {
    result.ctaOutcome = "brochure_requested";
  } else if (/\b(callback|call back|call me later|next week|busy)\b/.test(userText)) {
    result.ctaOutcome = "callback_requested";
  } else if (/\b(not interested|no thanks|don't want|stop calling|remove.*list)\b/.test(userText)) {
    result.ctaOutcome = "not_interested";
  }

  // Callback day
  const dayMatch = userText.match(
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|weekend)\b/,
  );
  if (dayMatch) result.callbackDay = dayMatch[1];

  return result;
}

function isIntent(v: string): v is Intent {
  return ["self_use", "investment", "both", "unclear"].includes(v);
}
function isLocation(v: string): v is LocationComfort {
  return ["comfortable", "hesitant", "prefers_other_area"].includes(v);
}
function isBudget(v: string): v is BudgetRange {
  return ["fits", "below", "above", "undisclosed"].includes(v);
}
function isTimeline(v: string): v is TimelineComfort {
  return ["comfortable", "wants_sooner", "unsure"].includes(v);
}
function isCta(v: string): v is CtaOutcome {
  return ["call_booked", "brochure_requested", "callback_requested", "not_interested"].includes(v);
}

/** Derive a single Lead status from qualification + call status. */
export function deriveLeadStatus(opts: {
  callStatus?: string;
  ctaOutcome?: CtaOutcome;
}): "new" | "queued" | "in_progress" | "completed" | "failed" {
  const cs = (opts.callStatus || "").toLowerCase();
  if (cs.includes("fail") || cs === "no-answer" || cs === "busy") return "failed";
  if (cs === "queued" || cs === "scheduled") return "queued";
  if (cs === "in-progress" || cs === "ringing") return "in_progress";
  if (cs === "completed" || opts.ctaOutcome) return "completed";
  return "new";
}

/** Pretty label + pill color for a disposition enum. */
export function labelCta(v?: string): { label: string; color: string } {
  switch (v) {
    case "call_booked":
      return { label: "Call booked", color: "pill-ok" };
    case "brochure_requested":
      return { label: "Brochure sent", color: "pill-info" };
    case "callback_requested":
      return { label: "Callback", color: "pill-warn" };
    case "not_interested":
      return { label: "Not interested", color: "pill-err" };
    default:
      return { label: "—", color: "pill" };
  }
}
