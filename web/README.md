# Divyasree LeadOps — Web App

Dashboard + API layer for the **Priya** voice qualification agent (deployed on [Bolna](https://bolna.ai)). Powers Divyasree Developers' lead pipeline for *Whispers of the Wind*.

**The workflow this solves:** Real-estate sales teams burn Property Experts on unqualified inbound leads. Priya takes the first call — introduces the project, qualifies on 4 checkpoints (intent, location, budget, timeline), and books the follow-up only for leads that warrant human time. This dashboard is where the sales manager adds leads, triggers the calls, and reviews the captured qualification data.

## Quick start

```bash
cd web
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open http://localhost:3000.

## Environment

Set in `.env`:

- `BOLNA_API_KEY` — your Bolna API key
- `BOLNA_AGENT_ID` — the Priya agent ID (already filled in)
- `DATABASE_URL` — defaults to SQLite at `./prisma/dev.db`
- `PUBLIC_BASE_URL` — used by the simulator to callback into the webhook

## Testing without a real phone call

Hit **Simulate** on any lead row. This posts a synthetic Bolna post-call payload (one of four scenarios: booked-investor, brochure-then-callback, wrong-area, busy-callback) at `/api/webhooks/bolna`. The handler runs the same parsing logic as real calls.

## Webhook endpoint

`POST /api/webhooks/bolna` — paste this URL (publicly reachable) into Bolna's agent *Analytics tab → Push all execution data to webhook*. Bolna calls out from IP `13.203.39.153` — whitelist if behind a firewall.

## Data model

- `Lead` — name, phone, source, plus the 5 captured qualification variables and current disposition.
- `Call` — one row per call attempt; stores execution id, transcript JSON, extracted data blob, summary, recording URL.

## Production shape

In a real deployment, leads don't get typed in — they arrive from ad platforms and portals. The dashboard's **Ops Controls** panel exposes the production flow:

- **Auto-dial on arrival** toggle — when on, every lead that enters via `/api/intake` is immediately dialled. Typical SLA: first touch within 5 minutes.
- **Dial all new** — fires Bolna calls for every lead currently in `new` status. Stand-in for the nightly batch pattern ("queue up arrivals, dial at 10 AM").
- **Fire Meta webhook** — triggers `POST /api/intake?source=meta_ads` with a canned Meta Lead Ads payload. In production this endpoint is pointed at by Meta's webhook subscription and the incoming lead objects are real.

### External intake endpoint

`POST /api/intake?source=<name>` — accepts several shapes:
- Direct flat: `{ "name": "…", "phone": "+91…", "notes": "…" }`
- Form-field style: `{ "full_name": "…", "phone_number": "+91…" }`
- Meta Lead Ads: `{ "field_data": [{"name":"full_name","values":["…"]}, …] }`

Point Meta/99acres/Google Lead Form webhooks at this URL (plus source query param) and leads flow in automatically. If `autoDial` is on, each arrival triggers Priya in the same request.

## Flow

```
Lead source (Meta Ads / 99acres / website / walk-in)
     → POST /api/intake
       → Lead row created
       → (if autoDial) POST /call to Bolna → Priya rings
     → Priya qualifies in ~2 min
     → Bolna POSTs post-call webhook → /api/webhooks/bolna
     → Lead row updated with intent / budget / timeline / outcome
     → Admin reviews "Qualified" column
     → Hands off booked calls to Property Expert
```

The **Add Lead** form and the per-row **Call** button are still there for the "VIP walk-in" exception path where a human manually injects a lead and dials it. The per-row **Demo** button fakes a post-call webhook and is for testing only — in production it would not exist.
