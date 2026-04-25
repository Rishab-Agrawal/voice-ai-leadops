import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed a realistic demo dataset. We insert 6 leads:
 *   - 2 fresh (status: new) — user can click "Call" on these
 *   - 4 with completed calls in different dispositions, so the pipeline
 *     shows call_booked / brochure_requested / callback_requested / not_interested
 *
 * The "completed" leads are populated by POSTing to our own simulate endpoint
 * so they exercise the full webhook path.
 */

const BASE = process.env.PUBLIC_BASE_URL || "http://localhost:3000";

const LEADS = [
  // Fresh leads
  { name: "Aarav Mehra", phone: "+919876543210", source: "website",
    notes: "Downloaded brochure from the Whispers of the Wind landing page." },
  { name: "Priyanka Shah", phone: "+919811122233", source: "meta_ads",
    notes: "Clicked Instagram carousel ad, filled lead form." },

  // Will be simulated to completed states
  { name: "Rohan Desai", phone: "+919845612378", source: "99acres",
    notes: "Enquiry on 99acres listing. Marked interest in investment plots." },
  { name: "Sneha Iyer", phone: "+919731122445", source: "referral",
    notes: "Referred by existing Valley of the Wind client." },
  { name: "Vikram Nair", phone: "+919887766554", source: "google_ads",
    notes: "Search query: plots near Nandi Hills." },
  { name: "Meera Kapoor", phone: "+919900112233", source: "magicbricks",
    notes: "Enquired about large plots." },
];

async function main() {
  console.log("Clearing existing data…");
  await prisma.call.deleteMany({});
  await prisma.lead.deleteMany({});

  const created: { id: string; name: string }[] = [];
  for (const l of LEADS) {
    const lead = await prisma.lead.create({ data: l });
    created.push({ id: lead.id, name: lead.name });
    console.log("Created", lead.name);
  }

  // Simulate completed calls for leads 3..6 (indexes 2..5)
  // Each call to /simulate advances the scenario based on existing call count.
  // We call simulate once for leads 2 and 3 (first two scenarios),
  // twice for lead 4 (second scenario), etc — but simplest is to call
  // for each lead enough times to land on the scenario we want.
  const scenarioIndex = [0, 1, 2, 3]; // call_booked, brochure, not_interested, callback
  for (let i = 0; i < 4; i++) {
    const lead = created[2 + i];
    const target = scenarioIndex[i];
    for (let s = 0; s <= target; s++) {
      const res = await fetch(`${BASE}/api/leads/${lead.id}/simulate`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        console.error("simulate failed for", lead.name, body);
        continue;
      }
      if (s === target) console.log(`  ${lead.name}: ${body.scenario}`);
    }
  }

  console.log("\nSeed complete. Open", BASE);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
