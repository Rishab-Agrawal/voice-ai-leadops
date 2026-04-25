import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { triggerOutboundCall } from "@/lib/bolna";
import { isAutoDialOn } from "@/lib/settings";

/**
 * External lead-source intake webhook. This is what Meta Lead Ads / 99acres /
 * website-form webhooks POST to. Accepts a forgiving payload shape and
 * normalizes it into a Lead row.
 *
 * Path strategy: source is passed in the query string or body, e.g.
 *   POST /api/intake?source=meta
 *
 * Payload — any of these shapes work:
 *
 *   { "full_name": "Aarav Mehra", "phone_number": "+919876543210",
 *     "ad_name": "wow_retargeting_q2" }
 *
 *   { "name": "Aarav", "phone": "+919876543210", "notes": "..." }
 *
 *   { "lead": { "name": "Aarav", "phone": "+91...", "source": "99acres" } }
 *
 * If the global autoDial setting is on, this endpoint will immediately
 * trigger a Bolna outbound call after creating the lead. This mirrors the
 * typical production setup where lead arrival → instant dial inside the
 * first five minutes.
 */

function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k] as T;
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const urlSource = new URL(req.url).searchParams.get("source");

  // Flatten nested shapes (e.g. Meta's {entry:[{changes:[{value:{...}}]}]})
  const leadObj =
    (body.lead as Record<string, unknown>) ||
    extractMetaLeadValue(body) ||
    body;

  const name = pick<string>(leadObj, "name", "full_name", "fullName", "first_name");
  const phone = pick<string>(leadObj, "phone", "phone_number", "phoneNumber", "mobile");
  const sourceFromBody = pick<string>(leadObj, "source", "form_name", "adset_name");
  const source = urlSource || sourceFromBody || "intake";
  const notes =
    pick<string>(leadObj, "notes", "message", "comments") ||
    buildSyntheticNotes(leadObj);

  if (!name || !phone) {
    return NextResponse.json(
      { error: "name and phone are required (accepts name|full_name, phone|phone_number)" },
      { status: 400 },
    );
  }
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    return NextResponse.json(
      { error: "phone must be in E.164 format (e.g. +919876543210)" },
      { status: 400 },
    );
  }

  const lead = await prisma.lead.create({
    data: { name, phone, source, notes: notes || null },
  });

  let callResult: unknown = null;
  let callError: string | null = null;
  const autoDialed = await isAutoDialOn();

  if (autoDialed) {
    try {
      const result = await triggerOutboundCall({
        recipientPhone: lead.phone,
        userData: { name: lead.name, lead_id: lead.id, source: lead.source ?? "" },
      });
      await prisma.call.create({
        data: {
          leadId: lead.id,
          executionId: result.execution_id || null,
          status: result.status || "queued",
        },
      });
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "queued" },
      });
      callResult = result;
    } catch (e) {
      callError = e instanceof Error ? e.message : String(e);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "failed" },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    lead,
    autoDialed,
    callResult,
    callError,
  });
}

function extractMetaLeadValue(body: Record<string, unknown>): Record<string, unknown> | null {
  // Meta's official webhook nests the lead fields deep. The real integration
  // would then hit Meta's Graph API using leadgen_id to resolve the form
  // fields. For the demo, we accept a flattened "field_data" array shape:
  // { field_data: [{ name: 'full_name', values: ['Aarav Mehra'] }, ...] }
  if (Array.isArray(body.field_data)) {
    const flat: Record<string, string> = {};
    for (const f of body.field_data as Array<{ name?: string; values?: string[] }>) {
      if (f?.name && Array.isArray(f.values) && f.values.length) {
        flat[f.name] = f.values[0];
      }
    }
    return flat;
  }
  return null;
}

function buildSyntheticNotes(leadObj: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const ad = pick<string>(leadObj, "ad_name", "ad_id", "campaign_name");
  const form = pick<string>(leadObj, "form_name", "form_id");
  if (ad) parts.push(`Ad: ${ad}`);
  if (form) parts.push(`Form: ${form}`);
  return parts.length ? parts.join(" · ") : null;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST a lead payload here. See app/api/intake/route.ts for accepted shapes.",
  });
}
