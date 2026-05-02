/**
 * Optional Slack alerting for post-call webhooks.
 *
 * If SLACK_WEBHOOK_URL is set in the environment, every parsed call also
 * fires a formatted Slack message via Slack's incoming-webhook API. If it
 * isn't set, this is a silent no-op so the rest of the webhook flow keeps
 * working unchanged.
 */

const TRANSCRIPT_CHAR_LIMIT = Number(process.env.SLACK_TRANSCRIPT_CHAR_LIMIT ?? 2400);

export interface SlackCallSummary {
  id: string | null;
  agentId: string | null;
  duration: number | null;
  transcript: { role: string; content: string }[];
}

export async function postSlackAlert(call: SlackCallSummary): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  const message = buildMessage(call);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[slack] post failed ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error(`[slack] post error:`, err instanceof Error ? err.message : err);
  }
}

function buildMessage(call: SlackCallSummary): unknown {
  const id = call.id ?? "(unknown)";
  const agentId = call.agentId ?? "(unknown)";
  const duration = formatDuration(call.duration);
  const transcript = formatTranscript(call.transcript);

  return {
    text: `📞 Bolna call completed (${id})`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "📞 Bolna call completed", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Execution ID*\n\`${id}\`` },
          { type: "mrkdwn", text: `*Agent ID*\n\`${agentId}\`` },
          { type: "mrkdwn", text: `*Duration*\n${duration}` },
          { type: "mrkdwn", text: `*Turns*\n${call.transcript.length}` },
        ],
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: transcript || "_No transcript available._",
        },
      },
    ],
  };
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "(unknown)";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatTranscript(turns: { role: string; content: string }[]): string {
  if (!turns.length) return "";
  const lines: string[] = [];
  for (const turn of turns) {
    const speaker = turn.role === "agent" ? "*Agent*" : "*Lead*";
    lines.push(`${speaker}: ${turn.content}`);
  }
  let body = lines.join("\n\n");
  if (body.length > TRANSCRIPT_CHAR_LIMIT) {
    body = body.slice(0, TRANSCRIPT_CHAR_LIMIT).trimEnd() + "…\n\n_(transcript truncated)_";
  }
  return `*Transcript*\n${body}`;
}
