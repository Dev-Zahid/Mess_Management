# Mess Manager SaaS

Bangladesh-style "mess" (shared boarding house) management system — multi-tenant SaaS
built with **Next.js (Pages Router)**, **Prisma**, and **PostgreSQL (Supabase)**, deployed
on **Vercel**. Each signup becomes its own `Organization` (tenant); every table is scoped
by `orgId` so many mess-owners safely share one database.

The dashboard UI itself (`public/app-shell.html`) is a large, mostly self-contained HTML/JS
app that talks to the backend through a single RPC endpoint (`/api/rpc`) — see
[How the frontend talks to the backend](#how-the-frontend-talks-to-the-backend) below.

---

## Tech stack

| Layer     | Choice                                   |
|-----------|-------------------------------------------|
| Framework | Next.js 14 (Pages Router)                 |
| Database  | PostgreSQL via Supabase                   |
| ORM       | Prisma 5                                  |
| Auth      | Custom — phone + PIN, JWT session cookie  |
| Hosting   | Vercel                                    |
| File I/O  | `xlsx` / `papaparse` (bulk import)        |

No other backend services are required — no Redis, no queue, no external auth provider.

---

## Features

- **Multi-tenant**: signup creates an `Organization` with a 7-day trial; every table carries `orgId`.
- **Roles**: `SuperAdmin` (platform operator), `Owner`/`Admin` (full access to their org),
  `Management` (per-resource, per-flat permissions set by the Owner).
- **Core modules**: Flats, Tenants, Rent/Service/Advance payments, Service Expenses,
  Owner Panel (owner payouts + advances), Investments.
- **Bulk import**: Excel template or a public Google Sheet link → preview → commit
  (Admin/Owner only).
- **Billing**: manual bKash/Nagad payment submission → Super Admin review → subscription
  extended automatically.
- **Super Admin console** (`/admin`): customer search/filter, extend/suspend/reactivate,
  plan changes, admin notes, revenue analytics, "View as Customer" impersonation (audit
  logged), coupon codes, platform-wide announcements, full audit log, CSV export.

---

## Getting started (fresh Supabase + Vercel project)

You do **not** need to change any code to point this at a brand-new Supabase/Vercel
project — every credential is read from environment variables (`.env` locally,
Project Settings → Environment Variables on Vercel). Nothing in the codebase is hardcoded
to a specific project.

### 1. Create a fresh Supabase project

1. [supabase.com](https://supabase.com) → **New project**. Pick a region close to your
   users (e.g. Singapore for Bangladesh).
2. Once it's provisioned: **Project Settings → Database → Connection string**.
3. You need **two** different connection strings:
   - **`DATABASE_URL`** — the **Transaction pooler** string (port `6543`). Must end in
     `?pgbouncer=true`. This is what the running app uses for every query.
   - **`DIRECT_URL`** — the **Session**/direct string (port `5432`, no pgbouncer). Only
     `prisma db push` / `prisma migrate` use this, because schema changes (DDL) don't work
     reliably through the pooler.
   > ⚠️ Mixing these up is the single most common setup mistake with this project — see
   > [Troubleshooting](#troubleshooting) below.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in:

```env
DATABASE_URL="postgresql://postgres.[project-ref]:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
JWT_SECRET="<a long random string — generate with: openssl rand -hex 32>"
SUPERADMIN_PHONE="01700000000"
SUPERADMIN_PIN="123456"
```

### 3. Install, push schema, seed the Super Admin

```bash
npm install
npm run db:push     # creates every table in the new Supabase database
npm run db:seed     # creates your Super Admin login (phone + PIN above)
npm run dev          # http://localhost:3000
```

Log in at `/login` with `SUPERADMIN_PHONE` / `SUPERADMIN_PIN` — you'll land on `/admin`.
**Change that PIN** (or the seeded phone number) before going live; anyone who guesses the
default has full platform access.

### 4. Set your real payment numbers

Edit `lib/plans.js` — replace the placeholder `PAYMENT_NUMBERS` (bKash/Nagad) with your
actual "Send Money" numbers, and adjust `PLANS` (pricing, trial length) as needed.

### 5. Deploy to Vercel

1. [vercel.com](https://vercel.com) → **Add New… → Project** → import this repository.
2. In **Project Settings → Environment Variables**, add the same five variables from your
   `.env` (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SUPERADMIN_PHONE`, `SUPERADMIN_PIN`).
3. Deploy. `postinstall` runs `prisma generate` automatically during the Vercel build.
4. Run `npm run db:seed` **once** against the production database (from your machine, with
   production `DATABASE_URL`/`DIRECT_URL` in your local `.env` temporarily) to create the
   production Super Admin.

### Retiring an old Supabase/Vercel project

If you're moving off a previous Supabase/Vercel project onto new ones:

1. Finish steps 1–5 above first and confirm the **new** deployment fully works (you can log
   in, create a test org, see data in the new Supabase table editor).
2. Update any DNS/custom domain to point at the new Vercel project.
3. Only then delete the old ones — **Vercel**: old Project → Settings → scroll to the
   bottom → *Delete Project*. **Supabase**: old project → Settings → General → scroll to the
   bottom → *Delete Project*. Both are permanent and cannot be undone, and Supabase deletes
   the underlying Postgres database (and all its data) immediately.
4. I can't do this deletion step myself — it requires your Supabase/Vercel dashboard login,
   which I don't have access to.

---

## Available scripts

| Command              | What it does                                             |
|-----------------------|-----------------------------------------------------------|
| `npm run dev`         | Local dev server                                          |
| `npm run build`       | Production build                                          |
| `npm run start`       | Run a production build locally                            |
| `npm run db:push`     | Push `prisma/schema.prisma` to the database (no migration files) |
| `npm run db:studio`   | Open Prisma Studio (browse/edit data)                     |
| `npm run db:seed`     | Create the Super Admin user                                |
| `node scripts/build-app-shell.js` | Regenerate `public/app-shell.html` after editing `source/index.html` or `source/stylesheet.html` |

---

## How the frontend talks to the backend

`public/app-shell.html` is a large single-page app (originally written for Google Apps
Script) that calls functions like:

```js
google.script.run.withSuccessHandler(cb).addTenant(data);
```

`public/gs-shim.js` reproduces that exact API in the browser and forwards every call to
`POST /api/rpc` as `{ fn: "addTenant", args: [data] }`, which dispatches to the matching
handler in `lib/rpc-handlers.js`. This means:

- **All access control lives server-side**, in `lib/rpc-handlers.js` and `lib/guard.js` —
  the HTML/JS frontend only *hides* buttons a user shouldn't see; it must never be trusted
  to enforce permissions on its own, since any request to `/api/rpc` can be made directly.
- If you change `source/index.html` or `source/stylesheet.html`, run
  `node scripts/build-app-shell.js` to regenerate `public/app-shell.html`.

---

## Project structure

```
prisma/schema.prisma       Database schema (Organization, User, Flat, Tenant, payments...)
lib/
  auth.js                  Session cookie (JWT), PIN hashing, org status
  guard.js                 Page-level auth guards (requireOrgUser, requireSuperAdmin)
  rpc-handlers.js           All business logic behind /api/rpc, scoped by orgId
  import-processor.js       Excel import → DB
  import-shared.js          Shared validation for Excel + Google Sheet import
  google-sheets-fetch.js    Pulls a public Google Sheet as CSV
  perms.js                 Per-resource view/edit/delete permission model
  plans.js                 Pricing, trial length, payment numbers
pages/
  api/                     API routes (auth, billing, import, admin, rpc)
  admin/                   Super Admin console pages
  dashboard/, billing.js, import.js, login.js, signup.js
public/app-shell.html       The actual dashboard UI (generated — see below)
source/                     Source-of-truth for app-shell.html (edit here, then rebuild)
```

---

## Security model (read this before adding a new RPC function)

- Every mutation in `lib/rpc-handlers.js` calls `authCheck(session, { resource, action, flatId })`
  — never trust `session` fields the client could influence; `session` comes only from the
  verified JWT cookie (`lib/auth.js`).
- Every **read** handler exposed through the `handlers` dispatch table must be wrapped with
  `scopedReader()` (see `lib/rpc-handlers.js`) so it's filtered to the caller's assigned
  flats and, where relevant, their `view` permission — because `/api/rpc` will run *any*
  function in that table for *any* logged-in user of the org, regardless of what the UI
  currently shows them. Adding a new `getX` handler without `scopedReader()` re-opens the
  exact data-leak class of bug that was fixed in this codebase (see below).
- Admin-only actions (bulk import, user management, flat management) must check
  `role === 'Owner' || role === 'Admin'` **on the server**, not just hide the button in the UI.

## Known fixes already applied in this codebase

A recent audit of this codebase found and fixed:

1. Read RPCs (`getTenants`, `getOwnerPayments`, `getInvestments`, etc.) were not scoped to
   the caller's flats/permissions when called directly — only the bulk `getAllData` call
   was. Fixed via `scopedReader()`.
2. Bulk import (`/import`, `/api/import/process`, `/api/import/google-sheet`) had no
   Admin-only check — any Management teammate could mass-overwrite org data. Now
   Owner/Admin-only.
3. Imported Service/Advance payments weren't tagged with `flatId`, unlike Rent payments —
   fixed, so flat-scoped visibility works consistently across all payment types.
4. `/api/billing/submit-payment` trusted a client-supplied `amount` instead of deriving it
   from the plan — fixed to always use the server-side price.
5. Signup PIN validation was weaker (any 4+ characters) than everywhere else in the app
   (`4–6 digits`) — made consistent.

6. Every API route now returns JSON on unexpected errors (`lib/api-wrapper.js`) instead of an
   HTML error page, so failures no longer show up as `Unexpected token '<'`.
7. Tenant leave date: a tenant marked *Left* with a **future** leave date stays Active (and keeps
   the seat) until that date has passed; then becomes Left automatically.
8. Tenant ID is generated on the server (`T001`, `T002`, …) — not typed by hand.
9. Owner Panel and Expenses month/year filters now apply to the summary cards too, not only the
   tables.
10. Service Charge / Advance Money **Unpaid** filter now lists tenants who have not paid anything
    (they have no payment row, so they used to be invisible).
11. **Settle & Exit** records the advance refund (`settleTenant`): it is added to Owner Panel →
    *Refunded / Spent* and removed from Advance Money *Collected*/*Held*.
12. Advance handed to the flat owner (Owner Advance Money) is now subtracted from the tenant
    deposits *Held* balance in Owner Panel and Expenses.

## Known limitations (not fixed — worth knowing about)

- **ID generation** (`genId()` in `lib/gen-id.js`) computes the next sequential ID
  (`T001`, `R002`, ...) by scanning existing rows rather than using a DB sequence/transaction.
  Two simultaneous writes for the same org could race and collide. Low risk for a single
  mess-owner's normal usage pattern, but worth knowing if you scale up write concurrency.
- Coupon codes exist in the schema and Super Admin UI, but there's no "apply coupon code"
  input in the signup/billing flow yet — only Super Admin can create/toggle them.
- No automated test suite. Changes to `lib/rpc-handlers.js` should be manually re-verified
  against the security model above.

---

## Troubleshooting

**`FATAL: (EMAXCONNSESSION) max clients reached in session mode`**
You're using the Session-mode connection string (port `5432`) for `DATABASE_URL`. Switch
`DATABASE_URL` to the **Transaction pooler** string (port `6543`, `?pgbouncer=true`) — Vercel
runs many serverless function instances at once, each holding its own connection, and
Session mode caps concurrent connections much lower than the pooler does.

**`prisma db push` fails or hangs**
Make sure `DIRECT_URL` is the plain/direct connection (port `5432`), not the pooled one —
DDL statements don't work reliably through pgbouncer.

**Local `next build` fails with `Cannot find module '.prisma/client/default'`**
Run `npx prisma generate` (or `npm install`, which does it via `postinstall`) — the Prisma
client is generated from `prisma/schema.prisma` and isn't checked into git.
