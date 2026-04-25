# Divyasree LeadOps

Voice-AI–powered lead qualification system for Divyasree Developers' *Whispers of the Wind* villa-plot project near Nandi Hills, Bengaluru.

## What it does

Real-estate sales teams burn senior Property Experts on cold inbound leads — most of which never convert. This system inserts a voice AI ("Priya") between lead capture and human follow-up: she calls the lead within minutes of arrival, qualifies them on four checkpoints (intent, geography, budget, timeline), and only surfaces warm prospects to the Expert team.

## Components

**Voice agent — Priya** runs on [Bolna](https://bolna.ai). System prompt lives in `system-prompt.txt`. Each call captures five enum-typed variables (intent, location_comfort, budget_range, timeline_comfort, cta_outcome) and exits in one of four branches: `call_booked`, `brochure_requested`, `callback_requested`, or `not_interested`.

**Web app — `web/`** is Next.js 14 + Prisma. Lead pipeline dashboard, lead detail view with transcript and call recording, intake webhooks for ad-platform / portal lead sources, batch-dial and auto-dial controls, and a per-call disposition strip. See `web/README.md` for run instructions.

## Architecture

```
Lead source (Meta Ads / 99acres / website / walk-in)
  → POST /api/intake
    → Lead row created
    → (if auto-dial on) POST /call to Bolna → Priya rings the lead
  → Priya qualifies in ~2 min
  → Bolna POSTs post-call webhook → /api/webhooks/bolna
  → Lead row updated with intent / budget / timeline / outcome
  → Admin reviews qualified leads on the dashboard
  → Hands off booked calls to a Property Expert
```

## Outcome metrics

- **Qualified-lead rate** — share of called leads ending in `call_booked` or `brochure_requested`.
- **Time to first touch** — minutes from lead arrival to Priya's call. Target: under five.
- **Expert-time efficiency** — fraction of Property Expert calls that come from a pre-qualified lead vs. cold inbound.

## Captured qualification schema

| Variable           | Values                                                          |
| ------------------ | --------------------------------------------------------------- |
| `intent`           | `self_use` · `investment` · `both` · `unclear`                  |
| `location_comfort` | `comfortable` · `hesitant` · `prefers_other_area`               |
| `budget_range`     | `fits` · `below` · `above` · `undisclosed`                      |
| `timeline_comfort` | `comfortable` · `wants_sooner` · `unsure`                       |
| `cta_outcome`      | `call_booked` · `brochure_requested` · `callback_requested` · `not_interested` |

## Deployment

Designed for **Railway** — Next.js auto-detects, SQLite works as-is via a persistent volume.

1. Push the repo to GitHub.
2. New Railway project from the GitHub repo.
3. Set environment variables (see `web/.env.example`): `BOLNA_API_KEY`, `BOLNA_AGENT_ID`, `DATABASE_URL` (SQLite path on a Railway volume, e.g. `file:/data/dev.db`), `PUBLIC_BASE_URL`.
4. Attach a volume to `/data` so SQLite survives redeploys.
5. After first deploy, point the Bolna agent's webhook URL at your Railway URL:
   ```
   WEBHOOK_URL=https://<your-app>.up.railway.app/api/webhooks/bolna python .work/patch_agent.py
   ```

For Vercel instead, swap the Prisma datasource to `postgresql` and provision a Neon or Vercel Postgres database.

## Repo layout

```
.
├── system-prompt.txt    Voice agent system prompt
├── web/                 Next.js dashboard
│   ├── app/             routes (server + client components)
│   ├── lib/             Bolna client, settings, transcript extraction
│   ├── prisma/          schema + dev SQLite
│   └── scripts/         seed, simulate, inspect
└── README.md
```
