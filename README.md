# Shamsia General Dealers — Super Agent Management System

A web application for tracking **float**, **transactions**, and **inventory** for Shamsia General Dealers, a super agent bridging mobile money agents (MTN, Airtel, Zamtel) and banking express agents with their respective providers/banks.

## Stack

- **Server**: Node.js, Express, Prisma ORM, PostgreSQL, JWT auth (plain JavaScript)
- **Client**: React 18, Vite, Tailwind CSS, TanStack Query, Recharts (plain JavaScript/JSX)

## How float and transactions are linked

- Every provider has a **master float account** (Shamsia's own balance) and every agent has its own float account per provider.
- **Float movements** (`/float`) record `TOPUP` (provider → master), `DISTRIBUTION` (master → agent), `RETURN` (agent → master), and `ADJUSTMENT`.
- **Transactions** (`/transactions`) are the agent's customer-facing activity (cash-in, cash-out, airtime, bill payment, deposit, withdrawal). Each one automatically adjusts the agent's float balance (e.g. cash-out increases agent float, cash-in decreases it) and computes commission — so the numbers stay consistent without manual reconciliation.

## Setup

### 1. Database

You need a PostgreSQL connection string (a free instance from [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app) works well). Set it in `server/.env` as `DATABASE_URL`, and set `DIRECT_URL` too — Prisma Migrate needs a non-pooled connection. If your provider only gives you one URL, use it for both.

### 2. Server

```bash
cd server
cp .env.example .env   # then edit DATABASE_URL and JWT_SECRET
npm install
npm run prisma:migrate -- --name init
npm run seed            # creates demo users, providers, agents, inventory
npm run dev             # http://localhost:4000
```

Seeded logins (all passwords work immediately, change them in production):

| Role    | Email                  | Password    |
|---------|-------------------------|-------------|
| Admin   | admin@shamsia.co.zm    | Admin@123   |
| Manager | manager@shamsia.co.zm  | Manager@123 |
| Teller  | teller@shamsia.co.zm   | Teller@123  |

### 3. Client

```bash
cd client
cp .env.example .env   # defaults to http://localhost:4000/api
npm install
npm run dev             # http://localhost:5173
```

## Roles

- **Admin**: full access, including user management.
- **Manager**: float, transactions, inventory, agents/providers, reports — no user management.
- **Teller**: records transactions and inventory movements only; no reports, agents, or user management.

## Deploying to the cloud later

Because the server uses Prisma against `DATABASE_URL`, moving from a local/dev Postgres instance to a managed cloud database is a one-line config change — no code changes required.

## A note on Neon's free tier

Neon's free plan suspends its compute after a period of inactivity. The first request after an idle stretch can take several seconds (occasionally longer) while it wakes back up — the server automatically retries on that specific error so the request still succeeds rather than failing outright, but the first request of the day may just feel slow. Once the app is being used, the connection stays warm and every subsequent request is fast. Upgrading the Neon project (or using an always-on Postgres instance) removes this entirely.
