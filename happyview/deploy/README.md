# Deploying the AppView on the NAS

The goal is a permanent AppView at a stable hostname, at no meaningful cost.

## Why this shape

**SQLite, not Postgres.** HappyView supports both. SQLite means one file and no
second service — which is what makes free hosting work at all. Managed Postgres
free tiers meter compute-hours (Neon gives ~100/month against the ~720 an
always-on service needs), so a database container would have been the thing that
eventually forced a bill.

**One container, not four.** The compose file in the HappyView repo is for
developing HappyView itself: it mounts the source, compiles with `cargo watch`,
and runs Caddy plus a Next.js dev server. The published image already has the
compiled binary and built dashboard inside it.

**A stable hostname matters more than it looks.** The atproto OAuth client id is
derived from `PUBLIC_URL`. If the hostname changes, every existing dashboard
login breaks. That rules out Cloudflare *quick* tunnels, which mint a random
`*.trycloudflare.com` name on every restart — fine for the spike, wrong here.

## Prerequisites

- Docker on the NAS (Synology Container Manager, QNAP Container Station,
  TrueNAS apps, or plain `docker` on any Linux)
- A hostname you control that resolves to the box. Two routes:
  - **Cloudflare named tunnel** — free, no port forwarding, no certificate
    management. Requires the domain's DNS to be hosted at Cloudflare.
  - **The NAS's own reverse proxy** — Synology and QNAP both do this with
    built-in Let's Encrypt. Requires a port forward and a dynamic-DNS name.

Either is fine. The tunnel avoids opening a port at the router, which is the
main reason to prefer it.

## Setup

1. Copy this directory to the NAS.

2. Create `.env` next to the compose file:

   ```
   PUBLIC_URL=https://appview.openmkt.app
   SESSION_SECRET=<openssl rand -base64 48>
   CLOUDFLARE_TUNNEL_TOKEN=<from the Cloudflare dashboard, if using a tunnel>
   ```

   `SESSION_SECRET` signs the dashboard cookie. If it is unset or weak the
   server still starts but cookie login is disabled, which looks like a broken
   login page rather than a config error.

3. Point the tunnel (or reverse proxy) at `http://127.0.0.1:3000`.

4. Start it:

   ```bash
   docker compose up -d
   docker compose logs -f happyview
   ```

5. Open `PUBLIC_URL`, log in with the openmkt handle. **First login becomes
   super user**, so do this before the hostname is publicly discoverable.

6. Create an API key and push the schemas from your workstation:

   ```bash
   HAPPYVIEW_URL=https://appview.openmkt.app \
   HAPPYVIEW_KEY=hv_... \
   node happyview/setup.mjs
   ```

## Choosing the hostname

`appview.openmkt.app` is the suggestion, and not only for tidiness.

When service identity is eventually configured, `did:web:openmkt.app` is already
taken — it currently serves the `BskyFeedGenerator` entry for the feed. Using a
subdomain gives the AppView `did:web:appview.openmkt.app` and sidesteps having
to merge two services into one DID document.

## Operating it

**Backups are one file.** `data/happyview.db`. Snapshot it with the NAS's normal
job. There is nothing else with state.

**Losing the database is not a disaster.** Everything in it is a copy of records
that live on sellers' PDSes. A fresh backfill rebuilds the index from the
network in seconds — that is what happened on the spike. The index is a cache,
never the source of truth.

**Moving it elsewhere** is a file copy plus a container start. No export/import.

**Updating:**

```bash
docker compose pull && docker compose up -d
```

Lexicons and Lua scripts survive restarts — they live in the database. Re-run
`setup.mjs` only when the schemas or scripts change; it is idempotent.

## Power

The one honest cost. A NAS idling draws roughly 10–30W, so a few dollars a month
depending on rates. The Raspberry Pi was free because it was already on, but it
runs Home Assistant OS — a locked appliance with no way to run arbitrary
containers — so that option was closed.
