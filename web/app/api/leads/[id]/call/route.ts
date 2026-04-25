import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { triggerOutboundCall } from "@/lib/bolna";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });

  try {
    const result = await triggerOutboundCall({
      recipientPhone: lead.phone,
      userData: { name: lead.name, lead_id: lead.id },
    });

    const call = await prisma.call.create({
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

    return NextResponse.json({ ok: true, call, bolna: result });
  } catch (e) {
    const err = e as Error & { status?: number; body?: unknown };
    return NextResponse.json(
      {
        error: err.message || "failed to trigger call",
        status: err.status,
        body: err.body,
      },
      { status: err.status && err.status >= 400 ? err.status : 500 },
    );
  }
}
