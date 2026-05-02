import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  deriveLeadStatus,
  extractFromTranscript,
  fromBolnaExtractedData,
  normalizeTranscript,
} from "@/lib/extract";
import { postSlackAlert } from "@/lib/slack";

/**
 * Receives post-call execution data from Bolna.
 * Bolna's webhook format is loosely documented; this handler is permissive
 * and reads from both top-level fields and nested objects.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Pull fields defensively — payload shape may vary.
  const executionId =
    (body.execution_id as string) ||
    (body.id as string) ||
    ((body.context_details as Record<string, unknown>)?.execution_id as string) ||
    null;

  const leadIdHint =
    ((body.context_details as Record<string, unknown>)?.lead_id as string) ||
    ((body.user_data as Record<string, unknown>)?.lead_id as string) ||
    null;

  const recipient =
    (body.recipient_phone_number as string) ||
    (body.to_phone_number as string) ||
    ((body.context_details as Record<string, unknown>)?.recipient_phone_number as string) ||
    null;

  const status = (body.status as string) || (body.call_status as string) || "completed";

  const durationRaw =
    (body.conversation_duration as number) ||
    (body.call_duration as number) ||
    (body.duration as number) ||
    null;

  const recordingUrl =
    (body.recording_url as string) || (body.telephony_data as Record<string, unknown>)?.recording_url as string || null;

  const summary =
    (body.summary as string) ||
    (body.transcript_summary as string) ||
    ((body.context_details as Record<string, unknown>)?.summary as string) ||
    null;

  const rawTranscript =
    body.transcript ??
    body.messages ??
    (body.context_details as Record<string, unknown>)?.transcript;
  const turns = normalizeTranscript(rawTranscript);

  const qual = {
    ...extractFromTranscript(turns),
    ...fromBolnaExtractedData(body.extracted_data),
  };

  const callbackDay =
    qual.callbackDay ||
    ((body.context_details as Record<string, unknown>)?.callback_day as string) ||
    null;
  const callbackTime =
    qual.callbackTime ||
    ((body.context_details as Record<string, unknown>)?.callback_time as string) ||
    null;

  // Resolve the lead: executionId first, then lead_id hint, then phone.
  let lead = null;
  let existingCall = null;

  if (executionId) {
    existingCall = await prisma.call.findUnique({
      where: { executionId },
      include: { lead: true },
    });
    if (existingCall) lead = existingCall.lead;
  }

  if (!lead && leadIdHint) {
    lead = await prisma.lead.findUnique({ where: { id: leadIdHint } });
  }

  if (!lead && recipient) {
    lead = await prisma.lead.findFirst({
      where: { phone: recipient },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!lead) {
    // Still 200 to Bolna so it doesn't retry indefinitely — but log the miss.
    return NextResponse.json(
      { ok: false, reason: "no matching lead" },
      { status: 200 },
    );
  }

  const callData = {
    status,
    duration: durationRaw ? Math.round(durationRaw) : null,
    recordingUrl: recordingUrl || null,
    transcript: turns.length ? JSON.stringify(turns) : null,
    summary,
    extracted: body.extracted_data ? JSON.stringify(body.extracted_data) : null,
    rawPayload: raw.length < 64_000 ? raw : raw.slice(0, 64_000),
    startedAt: body.started_at ? new Date(body.started_at as string) : null,
    endedAt: body.ended_at ? new Date(body.ended_at as string) : new Date(),
  } as const;

  if (existingCall) {
    await prisma.call.update({ where: { id: existingCall.id }, data: callData });
  } else {
    await prisma.call.create({
      data: {
        leadId: lead.id,
        executionId,
        ...callData,
      },
    });
  }

  const newStatus = deriveLeadStatus({ callStatus: status, ctaOutcome: qual.ctaOutcome });
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: newStatus,
      intent: qual.intent ?? lead.intent,
      locationComfort: qual.locationComfort ?? lead.locationComfort,
      budgetRange: qual.budgetRange ?? lead.budgetRange,
      timelineComfort: qual.timelineComfort ?? lead.timelineComfort,
      ctaOutcome: qual.ctaOutcome ?? lead.ctaOutcome,
      callbackDay: callbackDay ?? lead.callbackDay,
      callbackTime: callbackTime ?? lead.callbackTime,
    },
  });

  // Optional Slack alert. No-op if SLACK_WEBHOOK_URL isn't configured.
  // Awaited intentionally — we want delivery confirmed before responding to Bolna.
  await postSlackAlert({
    id: executionId,
    agentId: (body.agent_id as string) || null,
    duration: callData.duration ?? null,
    transcript: turns,
  });

  return NextResponse.json({ ok: true, leadId: lead.id, status: newStatus });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST Bolna post-call execution data here. See /api/leads/[id]/simulate for the payload shape.",
  });
}
