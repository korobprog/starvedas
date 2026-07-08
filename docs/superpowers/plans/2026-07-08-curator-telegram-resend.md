# Curator Telegram Resend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add and run a production-safe resend script for curator Telegram participant-list/sales notifications from order #76 onward.

**Architecture:** Create a standalone Node ESM script under `scripts/` that queries paid orders with curator Telegram IDs and participant lists, formats the same curator summary/name messages, sends them through the curator bot token with direct HTTPS/IP fallback, then execute it via Dokploy schedule. The script is intentionally independent from Next.js TypeScript aliases so it can run in production with `node`.

**Tech Stack:** Node.js ESM, Prisma Client, Telegram Bot API, Dokploy schedule execution.

## Global Constraints

- Do not print `.env` contents or secrets.
- Do not run production seed commands.
- Use Dokploy only for deployment/server execution.
- Resend starts at order #76 and defaults to all current later orders when no max is supplied.

---

### Task 1: Add curator resend script

**Files:**
- Create: `scripts/resend-curator-telegram-orders.mjs`

**Interfaces:**
- Consumes: `DATABASE_URL`, `CURATOR_TELEGRAM_BOT_TOKEN` or `TELEGRAM_BOT_TOKEN`, optional `TELEGRAM_API_IPS`.
- Produces: CLI `node scripts/resend-curator-telegram-orders.mjs [minOrder=76] [maxOrder]`, logs sent/skipped order numbers without secrets.

- [ ] Create the script with Prisma query, Telegram HTTPS/IP send helper, curator summary formatter, names formatter, and safe skip logging.
- [ ] Run `node --check scripts/resend-curator-telegram-orders.mjs`.

### Task 2: Verify and publish

**Files:**
- Modify: git index/history only.

**Interfaces:**
- Consumes: Task 1 script.
- Produces: pushed commit on `main`.

- [ ] Run `npm run typecheck`.
- [ ] Commit the script and plan.
- [ ] Push `main`.

### Task 3: Deploy and run resend

**Files:**
- No repo file changes.

**Interfaces:**
- Consumes: pushed `main`, Dokploy guru app `WFtj55x_P3cdkNaXmeAPJ`.
- Produces: Dokploy deployment `done`; temporary schedule run `done`; temporary schedule deleted.

- [ ] Trigger/reuse Dokploy deployment and wait for `done`.
- [ ] Run temporary Dokploy schedule: `node scripts/resend-curator-telegram-orders.mjs 76`.
- [ ] Confirm schedule deployment is `done`, then delete schedule.
