import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const calls = await prisma.call.findMany({ orderBy: { createdAt: "asc" } });
  console.log("Total calls:", calls.length);
  for (const c of calls) {
    console.log(`  ${c.id}  leadId=${c.leadId}  exec=${c.executionId}  status=${c.status}  dur=${c.duration}`);
  }
  const leads = await prisma.lead.findMany({ include: { _count: { select: { calls: true } } } });
  for (const l of leads) {
    console.log(`Lead ${l.name}: calls=${l._count.calls}`);
  }
}
main().finally(() => prisma.$disconnect());
