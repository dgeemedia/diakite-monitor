# Diakite Monitor

Internal, read-only monitoring dashboard for the Diakite platform. Runs as a
separate app on a separate host from `diakite.onrender.com` and the
`admin-web` app — it only *reads* Diakite's admin API through a server-side
proxy and never gets write access.

## Architecture

```
Browser (you)
   │  session cookie (this app's own login)
   ▼
diakite-monitor (Next.js, Vercel)
   │  server-side only — bot JWT never reaches the browser
   ▼
GET https://diakite.onrender.com/api/admin/*   (dedicated monitor-bot account)
```

- **This app's login** (`/login`) uses named accounts stored in this app's own database (`MonitorUser`), each with their own email/password — independent of Diakite's admin accounts. Every login attempt (success and failure) is recorded to `MonitorLoginLog`, visible on the `/login-history` page.
- **The proxy** (`src/app/api/diakite/[...path]/route.ts`) holds a JWT for one dedicated Diakite admin account and forwards allowlisted `GET` requests only — no route can mutate Diakite's production data through this app.
- **This app's own database** (`prisma/schema.prisma`) is small and separate from Diakite's Postgres — it only stores alert state and poll history.

## Monitoring admin activity specifically

Beyond platform health, this app also watches **what your admins are doing**
— the `/admin-activity` page and the evaluator's activity scan exist because
a compromised or careless admin account is one of the highest-impact risks
on a platform where staff can adjust wallets, issue refunds, and disburse
bonuses.

- `src/lib/adminRisk.ts` — classifies every `ActivityLog` action into
  `critical` / `high` / `medium` / `low`. Wallet adjustments, refunds, bonus
  disbursements, new admin account creation, and settings changes are
  `critical`. Suspensions, rejections, and cancellations are `high`.
- `/admin-activity` — groups the last 100 logged actions by actor (spot the
  admin doing an unusual volume of wallet edits), shows a live high-risk
  feed, and lists everything the evaluator has already confirmed + notified on.
- The evaluator (`/api/alerts/evaluate`) scans recent `ActivityLog` entries
  on every run, flags new critical/high actions into `FlaggedActivity`
  (deduped by source log id — no repeat notifications for the same event),
  and pages you immediately for critical actions or any high-tier action
  with a monetary amount attached.

### Two backend gaps worth closing

This page is only as good as what `ActivityLog` captures. Exact, drop-in
patches for both gaps — with precise find/replace anchors verified against
your real files — are in **`backend-patches/`**:
- `PATCH_NOTES.md` — line-by-line instructions with unique anchor text
- `auth.middleware.patched.js` — full file, changes marked `// ← ADDED`
- `auth.controller.patched.js` — full file, changes marked `// ← ADDED`

Summary of what they add:

**1. Failed authorization attempts.** When `authorize()`/`requireScope()` in
`auth.middleware.js` rejects a request with 403, nothing records who tried,
from where, or what they attempted.

**2. Admin logins (and failed login attempts).** `AdminProfile` tracks
`lastLoginAt`/`loginCount`, but there's no record of *which IP* an admin
logged in from, or how many times a password was tried and failed against
an admin account — your best brute-force signal.

Both are additive — no schema change, `ActivityLog` already has every field
they use. Once applied, `authorization_denied`, `admin_login`, and
`admin_login_failed` will automatically show up in `/admin-activity` and
`/audit-log` since the risk classifier already recognizes all three.

## First-time setup

### 1. Create the monitoring bot account on Diakite

From an existing SUPER_ADMIN session against the real admin API:

```
POST https://diakite.onrender.com/api/admin/users/create-admin
{
  "email": "monitor-bot@diakite.internal",
  "phone": "+2348065104250",
  "password": "<generate a long random password>",
  "firstName": "Monitor",
  "lastName": "Bot",
  "role": "ADMIN"
}
```

Use `ADMIN`, not `SUPPORT`/`MODERATOR` — some of the endpoints this dashboard
reads (`/payments/stats`, `/analytics/*`, `/logs`) are gated to
`ADMIN`/`SUPER_ADMIN` only in `admin.routes.js`.

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in:
- `DATABASE_URL` — a fresh Postgres instance (Vercel Postgres, Neon, or Supabase all work fine on free tiers)
- `DIAKITE_MONITOR_EMAIL` / `DIAKITE_MONITOR_PASSWORD` — the bot account from step 1
- `SESSION_SECRET` — `openssl rand -hex 32`
- Alert channels (`RESEND_API_KEY`, `TERMII_API_KEY`, etc.) — optional, leave blank to skip notifications for now

### 4. Push the local schema

```bash
pnpm db:push
```

### 5. Create your login account

There's no shared password — every person who views this dashboard gets
their own account, stored in this app's own `MonitorUser` table.

```bash
pnpm create-user -- --email=you@diakite.internal --name="Your Name" --password="$(openssl rand -base64 24)"
```

Or omit the flags and it'll prompt you interactively:

```bash
pnpm create-user
```

Running it again with the same email updates that person's password
instead of failing — handy for resets. Every login attempt against this
account (success or failure) is recorded and visible on the app's own
`/login-history` page once you're signed in.

To add a teammate later, just run the same command with their email — you
don't need to touch env vars or redeploy for that.

### 6. Run it

```bash
pnpm dev
```

Visit `http://localhost:3000`, sign in with the email/password you just created.

> **Check one thing before your first real run:** `src/lib/diakiteAuth.ts`
> assumes the login response nests the JWT at `data.token` (matching the
> `{ success, data: {...} }` shape every other Diakite controller uses). If
> your `auth.controller.js` returns it differently (e.g. `data.accessToken`),
> update the one line in `login()` accordingly.

## Deploying to Vercel

```bash
vercel
```

Then in the Vercel dashboard:
1. Add all the env vars from `.env.local` under Project Settings → Environment Variables.
2. Provision a Postgres database (Vercel Postgres, or paste a Neon URL into `DATABASE_URL`) and re-run `pnpm db:push` against it (or add a Vercel build step).
3. Create your login account against the **production** database — pull the prod `DATABASE_URL` into your shell temporarily and run the same script:
   ```bash
   DATABASE_URL="<production connection string>" pnpm create-user -- --email=you@diakite.internal --name="Your Name" --password="$(openssl rand -base64 24)"
   ```
   `pnpm db:push` and `pnpm create-user` are both just talking to whatever `DATABASE_URL` is currently set in your shell — they don't need to run "on Vercel" itself.
4. `vercel.json` already defines a cron hitting `/api/alerts/evaluate` every 5 minutes — Vercel enables this automatically on deploy. Set `CRON_SECRET` in env vars so the endpoint rejects anything that isn't the real cron invocation.
5. Optional: set up `scripts/check-diakite-health.ts` as a GitHub Actions scheduled workflow, so an independent check still runs even if Vercel itself has an outage.

## Adding a new monitored endpoint

1. Add the path to `ALLOWED_PREFIXES` in `src/app/api/diakite/[...path]/route.ts`.
2. Add a typed shape to `src/types/diakite.ts` if the response is new.
3. Add a fetcher function to `src/lib/diakiteClient.ts`.
4. Use `usePolling(diakite.yourNewFetcher, intervalMs)` in a page.

## Closing the gaps this dashboard can't see yet

This app can only show what Diakite's API already tracks. Two blind spots
worth closing on the **backend** (not this repo) when you have time:

- **Cron heartbeat** — `markOverdue()` / `resetMonthlySpend()` in `server.js` only `console.log`. Add a `JobRun` table and wrap each call so a silently-skipped run (e.g. after a redeploy near the trigger hour) is visible instead of invisible.
- **Webhook event log** — Paystack/Flutterwave webhook handlers don't currently persist success/failure separately from the `Payment` row they produce. A dedicated `WebhookEvent` log would catch silent webhook failures before they become "customer paid, wallet never updated" support tickets.

## Project layout

```
src/
├── app/
│   ├── page.tsx                       Overview
│   ├── payments/page.tsx
│   ├── rides-deliveries/page.tsx
│   ├── shield/page.tsx
│   ├── duopay/page.tsx
│   ├── corporate/page.tsx
│   ├── audit-log/page.tsx
│   ├── alerts/page.tsx
│   ├── login/page.tsx
│   └── api/
│       ├── diakite/[...path]/route.ts BFF proxy (allowlisted GET only)
│       ├── session/route.ts           this app's own login/logout
│       ├── alerts/route.ts            reads AlertState for the Alerts page
│       └── alerts/evaluate/route.ts   cron target — checks thresholds, notifies
├── components/
│   ├── layout/                        Sidebar, AppShell
│   └── ui/                            StatCard, StatusBadge
├── lib/
│   ├── diakiteAuth.ts                 server-only bot login/token cache
│   ├── diakiteClient.ts               typed browser-safe fetchers (hit our own proxy)
│   ├── session.ts                     this app's login session
│   ├── usePolling.ts                  client polling hook
│   ├── thresholds.ts                  alert threshold config
│   ├── notify.ts                      email/SMS senders
│   └── prisma.ts                      Prisma client singleton
├── types/diakite.ts                   response shapes mirrored from admin.controller.js
└── middleware.ts                      session gate on every route
```
