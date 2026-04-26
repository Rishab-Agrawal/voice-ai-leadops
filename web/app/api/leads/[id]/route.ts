import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: { calls: { orderBy: { createdAt: "desc" } } },
  });
  if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Cascade-deletes associated Call rows via Prisma's onDelete: Cascade.
    await prisma.lead.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 404 },
    );
  }
}
