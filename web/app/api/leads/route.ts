import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { triggerOutboundCall } from "@/lib/bolna";

export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { calls: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.name || !body.phone) {
    return NextResponse.json(
      { error: "name and phone are required" },
      { status: 400 },
    );
  }
  if (!/^\+[1-9]\d{6,14}$/.test(body.phone)) {
    return NextResponse.json(
      { error: "phone must be in E.164 format (e.g. +919876543210)" },
      { status: 400 },
    );
  }

  const lead = await prisma.lead.create({
    data: {
      name: body.name,
      phone: body.phone,
      source: body.source || null,
      notes: body.notes || null,
    },
  });

  if (body.callNow) {
    try {
      const result = await triggerOutboundCall({
        recipientPhone: lead.phone,
        userData: { name: lead.name, lead_id: lead.id },
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
    } catch (e) {
      // Save the lead anyway; the user can retry.
      return NextResponse.json({
        lead,
        callError: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ lead });
}
