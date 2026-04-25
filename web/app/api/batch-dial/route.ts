import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { triggerOutboundCall } from "@/lib/bolna";

/**
 * Dial every lead currently in "new" status. Stand-in for the typical ops
 * pattern of "leads queued overnight, dialed as a batch at 10 AM".
 *
 * Implementation note: Bolna exposes a batch API at `POST /batches` that
 * accepts a CSV upload. For a small queue (< a few hundred leads) iterating
 * single /call invocations here is simpler and gives per-lead error handling.
 * For large batches you'd swap to the batch endpoint and poll batch status.
 */
export async function POST(_req: NextRequest) {
  const newLeads = await prisma.lead.findMany({
    where: { status: "new" },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  const results: Array<{
    leadId: string;
    name: string;
    ok: boolean;
    executionId?: string;
    error?: string;
  }> = [];

  for (const lead of newLeads) {
    try {
      const r = await triggerOutboundCall({
        recipientPhone: lead.phone,
        userData: { name: lead.name, lead_id: lead.id, source: lead.source ?? "" },
      });
      await prisma.call.create({
        data: {
          leadId: lead.id,
          executionId: r.execution_id || null,
          status: r.status || "queued",
        },
      });
      await prisma.lead.update({ where: { id: lead.id }, data: { status: "queued" } });
      results.push({ leadId: lead.id, name: lead.name, ok: true, executionId: r.execution_id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await prisma.lead.update({ where: { id: lead.id }, data: { status: "failed" } });
      results.push({ leadId: lead.id, name: lead.name, ok: false, error: msg });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;
  return NextResponse.json({ attempted: results.length, ok, failed, results });
}
