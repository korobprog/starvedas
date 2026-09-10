# Telegram Proxy Cooldown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent repeated attempts through a known-failing Telegram HTTP proxy so Telegram calls quickly fall back to direct/IP routes.

**Architecture:** Add process-local cooldown state around Telegram proxy usage. When a proxy request fails, skip proxy attempts for a short configurable period and immediately use the existing direct/IP fallback. This keeps Dokploy secrets untouched and avoids relying on the broken `vless-1` route.

**Tech Stack:** Node.js, Next.js server code, TypeScript, existing Telegram HTTP/TLS helpers.

## Global Constraints

- Do not print `.env` contents or secrets.
- Keep changes focused on Telegram request routing.
- Do not modify Dokploy secret config from code.
- Preserve existing direct and pinned-IP fallback behavior.

---

### Task 1: Add Telegram Proxy Cooldown

**Files:**
- Modify: `src/server/telegram-notifications.ts`
- Modify: `src/app/api/telegram/curator/webhook/route.ts`
- Modify: `scripts/curator-bot-poller.mjs`
- Modify: `scripts/register-curator-webhook.mjs`

**Interfaces:**
- Consumes: existing `getTelegramProxyUrl()`, `getTelegramRequestTimeoutMs()`, and proxy fallback flow.
- Produces: `shouldUseTelegramProxy(proxyUrl)`, `markTelegramProxyFailure(proxyUrl, error)`, and cooldown env `TELEGRAM_PROXY_COOLDOWN_MS` / `CURATOR_TELEGRAM_PROXY_COOLDOWN_MS`.

- [ ] **Step 1: Add cooldown constants and state**

Add module-level `DEFAULT_TELEGRAM_PROXY_COOLDOWN_MS = 300000` and `telegramProxyCooldownUntilByUrl = new Map()`.

- [ ] **Step 2: Guard proxy attempts**

Before calling `postJsonViaHttpProxy`, check whether the current proxy URL is still in cooldown. If yes, skip proxy and use existing direct fallback.

- [ ] **Step 3: Mark failures**

When `postJsonViaHttpProxy` throws, store `Date.now() + cooldownMs` for the proxy URL and log the cooldown duration.

- [ ] **Step 4: Verify**

Run `npm run lint` or, if unavailable/failing for unrelated reasons, run TypeScript/static checks that are present in package scripts and inspect changed files for syntax.
