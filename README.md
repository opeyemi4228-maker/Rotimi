# MAP — Movement for Amaechi Presidency

The membership and structure platform: a public site, a member portal, and a
secretariat dashboard scoped to whatever office the reader holds.

Built on Next.js 16 (App Router), Prisma 7 against Postgres, and Tailwind 4.

---

## What is in here

| Area | Route | Who sees it |
|---|---|---|
| Public site | `/`, `/about`, `/structure`, … | Anybody |
| Registration | `/join` | Anybody |
| Member portal | `/portal` | Any signed-in member |
| Membership card | `/portal/id-card` | Any signed-in member |
| Secretariat | `/admin/**` | Members holding an active seat |

The secretariat is scoped by the seat, not by a role name: every query goes
through `memberScopeWhere` / `seatScopeWhere` in `lib/permissions.js`, so an LGA
Coordinator's page and an LGA Coordinator's API response are limited by the same
clause. See the header of that file before changing anything in it.

---

## Running it

### 1. Environment

Copy `.env.example` to `.env.local` and fill in all three:

```bash
cp .env.example .env.local
openssl rand -base64 48   # SESSION_SECRET
openssl rand -base64 32   # NIN_ENCRYPTION_KEY
```

- `DATABASE_URL` — the **pooled** Postgres string. On Neon the host ends
  `-pooler`; the unpooled one runs out of connections under any real traffic.
- `SESSION_SECRET` — signs the member session cookie. Sessions cannot be issued
  without it, and rotating it signs everybody out.
- `NIN_ENCRYPTION_KEY` — AES-256-GCM key, exactly 32 bytes base64. **If it is
  unset, a submitted NIN is discarded rather than stored in plaintext** (§13.2).
  Losing an optional field is recoverable; leaking a national identity number is
  not.

`.env` and `.env.local` are both gitignored. Nothing secret belongs in the repo.

### 2. Database

```bash
npm install
npm run db:migrate        # prisma migrate deploy
npm run db:seed           # zones, states, LGAs, wards, polling units, seats
```

The seed takes a few minutes on a first run — it writes 8,809 wards, 176,623
polling units and 92,184 seats. It is **idempotent and reconciling**: run it
again after any change to `public/geo` and it applies the difference rather than
duplicating. `npm run db:seed -- --dry-run` reports what it would do and writes
nothing.

If you are upgrading a database that predates referral codes:

```bash
npm run referrals:backfill
```

### 3. Develop

```bash
npm run dev
```

---

## The INEC register

`public/geo/` holds the register the registration form selects from: 37 states,
774 LGAs, **8,809 wards** and **176,623 polling units**, current as of the 2021
delimitation — the expansion that created 56,737 new polling units for the 2023
general election.

It is committed, so the site builds and deploys with no network. Rebuild it only
when INEC publishes a revision:

```bash
npm run geo:build              # uses scripts/.inec-source cache if present
npm run geo:build -- --refresh # re-download
npm run db:seed                # then reconcile the database against it
```

Every row carries INEC's own delimitation code — `28/06/07/003` is written
`OND-006-07-003` — and the server resolves a registration against that code, not
against the spelling of a ward name. Read the header of
`scripts/build-geography.mjs` before touching the data; it documents which
upstream spellings are corrected and why.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint (currently zero errors, zero warnings) |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed / reconcile reference data |
| `npm run db:studio` | Prisma Studio |
| `npm run geo:build` | Rebuild `public/geo` from the INEC source |
| `npm run referrals:backfill` | Issue referral codes to members without one |

---

## Deploying

Any Node host that can run `next build` and reach Postgres. On Vercel:

1. Set `DATABASE_URL`, `SESSION_SECRET` and `NIN_ENCRYPTION_KEY` as project
   environment variables. Do not commit them.
2. `npm run db:migrate` against the production database before the first deploy.
3. `npm run db:seed` once, from a machine with the repo checked out — it needs
   `public/geo`, and it is far too long-running for a build step.

`sharp` is a runtime dependency, not just a build one: the membership card is
rasterised on the server (`lib/idcard.js`). Any host that supports Next's
default image optimisation already has it.

Notes on migrations against a pooled connection: Prisma takes a Postgres
advisory lock, which PgBouncer in transaction mode does not honour. If
`migrate deploy` times out with `P1002`, run it with
`PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true`, or point it at the unpooled URL.

---

## Conventions

- **Server-only modules** — `lib/auth.js`, `lib/permissions.js`, `lib/store.js`,
  `lib/dashboard.js`, `lib/referrals.js`, `lib/idcard.js`. Never import these
  into a client component.
- **Scope checks are server-side, always** (§13.2). Hiding a button is not a
  permission.
- Files carry their reasoning in a header comment. If a decision looks odd, the
  reason it was made that way is usually written directly above it.
