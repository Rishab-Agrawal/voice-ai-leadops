// Fire a synthetic Bolna post-call webhook at our own /api/webhooks/bolna endpoint.
// Useful for testing without placing a real phone call.
//
// Usage:
//   npx tsx scripts/simulate-webhook.ts <leadId> [scenario]
//
// scenario defaults to "call_booked_investor". Other options:
//   brochure_then_callback | not_interested_wrong_area | busy_callback

const leadId = process.argv[2];
const scenarioArg = process.argv[3];

if (!leadId) {
  console.error("Usage: tsx scripts/simulate-webhook.ts <leadId> [scenario]");
  process.exit(1);
}

const base = process.env.PUBLIC_BASE_URL || "http://localhost:3000";

async function run() {
  const res = await fetch(`${base}/api/leads/${leadId}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario: scenarioArg }),
  });
  console.log(res.status, await res.text());
}
run().catch(console.error);
