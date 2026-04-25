# Divyasree LeadOps — Web App

Dashboard + API layer for the **Priya** voice qualification agent (deployed on [Bolna](https://bolna.ai)). Powers Divyasree Developers' lead pipeline for *Whispers of the Wind*.

**The workflow this solves:** Real-estate sales teams burn Property Experts on unqualified inbound leads. Priya takes the first call — introduces the project, qualifies on four checkpoints (intent, location, budget, timeline), and books the follow-up only for leads that warrant human time. This dashboard is where the sales manager reviews the captured qualification data and hands off warm leads.

## Quick start

```bash
cd web
npm install
npx prisma generate
npx prisma db push
npx tsx scripts/seed.ts   # optional — seeds 6 demo leads in varied states
npm run dev
```

Open http://localhost:3000.

## Environment

Set in `web/.env` (gitignored — see `.env.example` for the shape):

- `BOLNA_API_KEY` — your Bolna API key
- `BOLNA_AGENT_ID` — the Priya agent ID
- `DATABASE_URL` — SQLite path (e.g. `file:./dev.db` locally, `file:/data/dev.db` on a Railway volume)
- `PUBLIC_BASE_URL` — origin used by the demo intake flow to call back into the webhook (e.g. `http://localhost:3000`)

## Dev mode (`?dev=1`)

The dashboard hides demo-only controls in production. Append `?dev=1` to the URL to surface them:

- **Simulate ad lead** — appears in the table toolbar; injects a synthetic Meta Lead Ads webhook payload at `/api/intake?source=meta_ads`. In production, real Meta webhooks fire this endpoint automatically.
- **Demo** — appears as a per-row button in the lead table; injects a synthetic Bolna post-call payload at `/api/webhooks/bolna`. Cycles through four scenarios (booked-investor, brochure-then-callback, wrong-area, busy-callback) so you can populate the dashboard without placing real calls.

Without `?dev=1`, only real production controls are visible: `Dial all new`, `Auto-dial on arrival`, `+ New lead`, and the per-row phone-icon Call button.

## Production controls (always visible)

The All Leads card's toolbar contains:

- **Auto-dial on arrival** toggle — when on, every lead arriving via `/api/intake` is dialled in the same request. Production SLA: under five minutes to first touch.
- **Dial all new (N)** — fires Bolna `/call` for every lead currently in `new` status. Stand-in for the nightly batch pattern ("queue arrivals overnight, dial at 10 AM").

The header has **+ New lead** for the manual override path (VIP walk-in, an admin types the lead in by hand).

## API surface

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/intake?source=<name>` | **External lead-source webhook.** Meta Lead Ads / 99acres / website forms point here. Accepts flat, form-field, or Meta `field_data` shapes. Auto-dials if the toggle is on. |
| `POST` | `/api/batch-dial` | Dial every `new` lead via Bolna `/call`. |
| `POST` | `/api/leads` | Manual lead creation (admin form). |
| `POST` | `/api/leads/:id/call` | Trigger a call for one lead. |
| `POST` | `/api/leads/:id/simulate` | Demo only — fake a Bolna post-call webhook. |
| `GET` `PATCH` | `/api/settings` | Read / update the `autoDial` toggle. |
| `POST` | `/api/webhooks/bolna` | Receive Bolna's post-call execution payload. Configured in Bolna's *Analytics tab → Push all execution data to webhook*. Bolna calls out from IP `13.203.39.153` — whitelist if behind a firewall. |

## Intake payload shapes

`POST /api/intake?source=<name>` accepts any of:

```json
{ "name": "Aarav Mehra", "phone": "+919876543210", "notes": "..." }
```
```json
{ "full_name": "Aarav Mehra", "phone_number": "+919876543210" }
```
```json
{ "field_data": [
    {"name": "full_name", "values": ["Aarav Mehra"]},
    {"name": "phone_number", "values": ["+919876543210"]}
] }
```

## Data model

- **`Lead`** — name, phone, source, the five captured qualification variables, current disposition, optional callback day/time, notes.
- **`Call`** — one row per call attempt: Bolna execution ID, status, duration, transcript JSON, summary, recording URL, raw webhook payload.
- **`Setting`** — generic key-value store; currently holds `autoDial`.

Schema lives in `prisma/schema.prisma`. Change it then run `npx prisma db push` to apply.

## Flow

```
Lead source (Meta Ads / 99acres / website / walk-in)
     → POST /api/intake
       → Lead row created
       → (if autoDial) POST /call to Bolna → Priya rings
     → Priya qualifies in ~2 min
     → Bolna POSTs post-call webhook → /api/webhooks/bolna
     → Lead row updated with intent / budget / timeline / outcome
     → Admin reviews "Qualified" leads on the dashboard
     → Hands off booked calls to a Property Expert
```
