import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Simulate a Bolna post-call webhook for this lead. Rotates through a
 * handful of realistic scenarios so the dashboard shows a variety of
 * dispositions during demo/testing.
 */

type Scenario = {
  name: string;
  transcript: { role: string; content: string }[];
  extracted: {
    intent: string;
    location_comfort: string;
    budget_range: string;
    timeline_comfort: string;
    cta_outcome: string;
  };
  callback_day?: string;
  callback_time?: string;
  duration: number;
  summary: string;
};

const SCENARIOS: Scenario[] = [
  {
    name: "call_booked_investor",
    transcript: [
      { role: "agent", content: "Hi, this is Priya from Divyasree Developers. I'm reaching out about our new project, Whispers of the Wind, near Nandi Hills. Is this a good time to speak for a couple of minutes?" },
      { role: "user", content: "Yeah, sure, go ahead." },
      { role: "agent", content: "So Whispers of the Wind is a 38-acre ultra-premium villa plot project right next to Nandi Hills, with just 207 exclusive plots. Are you exploring this for a personal retreat, or more from an investment angle?" },
      { role: "user", content: "Mostly for investment, honestly. North Bengaluru looks like it's heating up." },
      { role: "agent", content: "Absolutely — the corridor has seen 15 to 20 per cent appreciation year on year. Are you familiar with the Nandi Hills area?" },
      { role: "user", content: "Yes, we've visited a few times. We like it." },
      { role: "agent", content: "Lovely. Our plots start at around ninety-two lakh and go up based on size and location within the project. Does that broadly align with what you had in mind?" },
      { role: "user", content: "Yes that works, I was looking in that range." },
      { role: "agent", content: "Great. Possession is expected by December 2029. Is that timeline comfortable for you?" },
      { role: "user", content: "Yeah that's fine, no rush." },
      { role: "agent", content: "Wonderful. I'd love to arrange a quick call with one of our Property Experts who can walk you through the layout, pricing for specific plots, and payment plan options. Would Thursday work for you?" },
      { role: "user", content: "Sure, set up Thursday evening around 6 pm." },
      { role: "agent", content: "Wonderful. Thank you so much for your time. Our Property Expert will reach out to you on Thursday at 6 pm. Have a great day ahead." },
    ],
    extracted: {
      intent: "investment",
      location_comfort: "comfortable",
      budget_range: "fits",
      timeline_comfort: "comfortable",
      cta_outcome: "call_booked",
    },
    callback_day: "Thursday",
    callback_time: "6:00 PM",
    duration: 152,
    summary:
      "Investor lead, comfortable with location and budget, happy with December 2029 timeline. Expert call booked for Thursday 6 PM.",
  },
  {
    name: "brochure_then_callback",
    transcript: [
      { role: "agent", content: "Hi, this is Priya from Divyasree Developers. I'm reaching out about our new project, Whispers of the Wind, near Nandi Hills. Is this a good time to speak for a couple of minutes?" },
      { role: "user", content: "Okay, briefly." },
      { role: "agent", content: "So Whispers of the Wind is a 38-acre ultra-premium villa plot project right next to Nandi Hills, with just 207 exclusive plots. Are you exploring this for a personal retreat, or more from an investment angle?" },
      { role: "user", content: "A bit of both actually. A weekend home that also appreciates." },
      { role: "agent", content: "That's a great combination — lifestyle plus upside. Are you familiar with the Nandi Hills area?" },
      { role: "user", content: "How far is it from the airport? I travel a lot." },
      { role: "agent", content: "It's just about 20 minutes from the international airport, very well connected via NH-44. Our plots start at around ninety-two lakh and go up based on size. Does that align with what you had in mind?" },
      { role: "user", content: "Yeah that sounds okay. Can you send me a brochure on WhatsApp first? I'll review it." },
      { role: "agent", content: "Absolutely, no rush. May I send you a digital brochure on WhatsApp, and perhaps we can reconnect next week?" },
      { role: "user", content: "Yes please, that'd be great." },
      { role: "agent", content: "Wonderful. Thank you so much for your time. Our Property Expert will reach out to you with more details shortly. Have a great day ahead." },
    ],
    extracted: {
      intent: "both",
      location_comfort: "hesitant",
      budget_range: "fits",
      timeline_comfort: "comfortable",
      cta_outcome: "brochure_requested",
    },
    callback_day: "next week",
    duration: 118,
    summary:
      "Dual intent (self + investment), slight hesitancy on location resolved with airport proximity. Brochure requested, callback next week.",
  },
  {
    name: "not_interested_wrong_area",
    transcript: [
      { role: "agent", content: "Hi, this is Priya from Divyasree Developers. I'm reaching out about our new project, Whispers of the Wind, near Nandi Hills. Is this a good time to speak for a couple of minutes?" },
      { role: "user", content: "Yeah okay." },
      { role: "agent", content: "So Whispers of the Wind is a 38-acre ultra-premium villa plot project right next to Nandi Hills. Are you exploring this for a personal retreat, or more from an investment angle?" },
      { role: "user", content: "Look, I'm really only interested in South Bengaluru. Sarjapur side." },
      { role: "agent", content: "I hear you — South Bengaluru has its charm. The Nandi Hills corridor is seeing infrastructure investment comparable to what Sarjapur saw ten years ago. But if it's not the right fit, I completely understand." },
      { role: "user", content: "Yeah not really interested, thanks." },
      { role: "agent", content: "Completely understand, and thank you for your time. If you'd ever like to explore the project later, feel free to visit our website. Wishing you a great day." },
    ],
    extracted: {
      intent: "unclear",
      location_comfort: "prefers_other_area",
      budget_range: "undisclosed",
      timeline_comfort: "unsure",
      cta_outcome: "not_interested",
    },
    duration: 64,
    summary:
      "Lead prefers South Bengaluru, not a fit for Nandi Hills product. Graceful exit, no follow-up.",
  },
  {
    name: "busy_callback",
    transcript: [
      { role: "agent", content: "Hi, this is Priya from Divyasree Developers. I'm reaching out about our new project, Whispers of the Wind, near Nandi Hills. Is this a good time to speak for a couple of minutes?" },
      { role: "user", content: "I'm in a meeting, can you call me back later?" },
      { role: "agent", content: "No problem at all — I'll arrange for us to reach out at a more convenient time. Thank you, and have a great day." },
    ],
    extracted: {
      intent: "unclear",
      location_comfort: "comfortable",
      budget_range: "undisclosed",
      timeline_comfort: "unsure",
      cta_outcome: "callback_requested",
    },
    callback_day: "tomorrow",
    duration: 18,
    summary: "Caller was busy in a meeting. Callback requested.",
  },
];

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: { calls: true },
  });
  if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });

  // Pick a scenario deterministically based on existing call count, so each
  // click cycles through the set.
  const scenario = SCENARIOS[lead.calls.length % SCENARIOS.length];

  const executionId = `sim-${lead.id.slice(0, 6)}-${Date.now()}`;
  const startedAt = new Date(Date.now() - scenario.duration * 1000);
  const endedAt = new Date();

  // Emulate the Bolna post-call webhook by hitting our own webhook endpoint.
  // This exercises the same parsing path that real calls use.
  const origin = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
  const payload = {
    execution_id: executionId,
    agent_id: process.env.BOLNA_AGENT_ID,
    recipient_phone_number: lead.phone,
    status: "completed",
    conversation_duration: scenario.duration,
    recording_url: null,
    summary: scenario.summary,
    transcript: scenario.transcript,
    extracted_data: {
      "Lead Qualification": Object.fromEntries(
        Object.entries(scenario.extracted).map(([k, v]) => [
          k,
          { subjective: "", objective: v },
        ]),
      ),
    },
    context_details: {
      lead_id: lead.id,
      callback_day: scenario.callback_day,
      callback_time: scenario.callback_time,
    },
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    _simulated: true,
  };

  const res = await fetch(`${origin}/api/webhooks/bolna`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: "webhook simulation failed", detail: body },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, scenario: scenario.name, webhookResponse: body });
}
