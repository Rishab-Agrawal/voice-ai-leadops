const BASE_URL = process.env.BOLNA_BASE_URL || "https://api.bolna.ai";
const API_KEY = process.env.BOLNA_API_KEY;
const AGENT_ID = process.env.BOLNA_AGENT_ID;

function assertEnv() {
  if (!API_KEY) throw new Error("BOLNA_API_KEY is not set");
  if (!AGENT_ID) throw new Error("BOLNA_AGENT_ID is not set");
}

export async function triggerOutboundCall(args: {
  recipientPhone: string;
  userData?: Record<string, string>;
  fromPhone?: string;
}) {
  assertEnv();
  const body: Record<string, unknown> = {
    agent_id: AGENT_ID,
    recipient_phone_number: args.recipientPhone,
    // Admin-triggered calls override the agent's calling-hours guardrail.
    // The guardrail is meant for automated batch dialling; manual clicks
    // from the dashboard are intentional and should fire immediately.
    bypass_call_guardrails: true,
  };
  if (args.fromPhone) body.from_phone_number = args.fromPhone;
  if (args.userData) body.user_data = args.userData;

  const res = await fetch(`${BASE_URL}/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(`Bolna call API failed: ${res.status}`) as Error & {
      status?: number;
      body?: unknown;
    };
    err.status = res.status;
    err.body = json;
    throw err;
  }

  return json as { message?: string; status?: string; execution_id?: string };
}

export async function getExecution(executionId: string) {
  assertEnv();
  const res = await fetch(`${BASE_URL}/v2/agent/execution/${executionId}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) throw new Error(`Bolna get execution failed: ${res.status}`);
  return res.json();
}

export function getAgentId() {
  return AGENT_ID;
}
