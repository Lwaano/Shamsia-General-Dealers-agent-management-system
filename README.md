# Shamsia General Dealers — Super Agent Management System

A web application for tracking **float**, **transactions**, **inventory**, and **day-to-day reconciliation** across Shamsia General Dealers' branch network — a super agent bridging mobile money agents (MTN, Airtel, Zamtel) and banking express agents with their respective providers/banks.

## Stack

- **Server**: Node.js, Express, Prisma ORM, PostgreSQL, JWT auth (plain JavaScript)
- **Client**: React 18, Vite, Tailwind CSS, TanStack Query, Recharts (plain JavaScript/JSX)
- **Exports**: CSV and multi-sheet Excel workbooks (via ExcelJS)

## How the pieces fit together

- **Branches**: Shamsia operates multiple physical branches (e.g. ten in Mazabuka, one in Pemba). Every branch has its own **master float account** per provider and its own network of agents — float and transactions are tracked per branch first, then combined for a company-wide total.
- **Float movements** (`/float`) record `TOPUP` (provider → a branch's master account), `DISTRIBUTION` (master → agent), `RETURN` (agent → master), and `ADJUSTMENT`.
- **Transactions** (`/transactions`) are an agent's customer-facing activity (cash-in, cash-out, airtime, bill payment, deposit, withdrawal). Each one automatically adjusts the agent's float balance (e.g. cash-out increases agent float, cash-in decreases it) and computes commission — so the numbers stay consistent without manual reconciliation.
- **Day Reconciliation** (`/reconciliation`) is a till/float open-and-close cycle per account: opening a day snapshots the system float balance and (for agent accounts) an opening cash count; closing a day asks for the physically counted float and cash, computes the expected cash position from that window's transactions, and flags any float or cash **variance** — so a shortage shows up immediately, with the exact transactions/float movements from that window available to trace where it came from.
- **Audit Log** (`/audit-log`, admin only): every login (success or failure) and every create/update across the system is recorded with who did it, when, and the relevant details.
- **Reports** (`/reports`): date-range summaries per module, a transactions CSV export, and a single **Excel workbook export** covering transactions, float movements, inventory movements, reconciliations, and current float/inventory snapshots in one file.

## Setup

### 1. Database

You need a PostgreSQL connection string (a free instance from [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app) works well). Set it in `server/.env` as `DATABASE_URL`, and set `DIRECT_URL` too — Prisma Migrate needs a non-pooled connection. If your provider only gives you one URL, use it for both.

### 2. Server

```bash
cd server
cp .env.example .env   # then edit DATABASE_URL and JWT_SECRET
npm install
npm run prisma:migrate -- --name init
npm run seed            # creates demo branches, users, providers, agents, inventory
npm run dev             # http://localhost:4000
```

Seeded logins (all passwords work immediately, change them in production):

| Role    | Email                  | Password    | Branch                |
|---------|-------------------------|-------------|------------------------|
| Admin   | admin@shamsia.co.zm    | Admin@123   | All branches (HQ)     |
| Manager | manager@shamsia.co.zm  | Manager@123 | Mazabuka Branch 1     |
| Teller  | teller@shamsia.co.zm   | Teller@123  | Mazabuka Branch 1     |

The seed creates 11 branches (10 in Mazabuka, 1 in Pemba), each with its own master float account per provider.

### 3. Client

```bash
cd client
cp .env.example .env   # defaults to http://localhost:4000/api
npm install
npm run dev             # http://localhost:5173
```

## Roles and branch access

- **Admin**: full access across every branch, including user management and the audit log, with a branch filter to drill into any single branch's numbers or view the combined total.
- **Manager**: float, transactions, inventory, agents/providers/branches, reports — scoped to their own assigned branch only. No user management.
- **Teller**: records transactions and inventory movements, and runs day reconciliation — scoped to their own assigned branch only. No reports, agent/branch management, or user management.

Each user's **name and position** (job title, distinct from their access role) are shown in the sidebar once logged in.

## Deploying to the cloud later

Because the server uses Prisma against `DATABASE_URL`, moving from a local/dev Postgres instance to a managed cloud database is a one-line config change — no code changes required.

## A note on Neon's free tier

Neon's free plan suspends its compute after a period of inactivity. The first request after an idle stretch can take several seconds (occasionally longer) while it wakes back up — the server automatically retries on that specific error so the request still succeeds rather than failing outright, but the first request of the day may just feel slow. Once the app is being used, the connection stays warm and every subsequent request is fast. Upgrading the Neon project (or using an always-on Postgres instance) removes this entirely.
