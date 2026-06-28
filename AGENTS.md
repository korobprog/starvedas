# StarVedas agent instructions

- This is a Next.js/Prisma project. Prefer targeted searches (`rg`, `git grep`) over recursive directory listings.
- Never recursively read or list these generated/vendor directories: `node_modules/`, `.next/`, `out/`, `build/`, `dist/`, `coverage/`, `.playwright-mcp/`.
- Avoid dumping large files or command outputs into the chat. Use `Get-Content -TotalCount`, `Select-String`, `rg -n`, or summaries, and keep shell `max_output_tokens` modest.
- Do not print `.env` contents or secrets. Use existence/key-name checks only.
- If library/framework/API/CLI docs are needed, use Context7 first as configured in `C:\Users\makst\.codex\AGENTS.md`.
- Use Dokploy MCP only when deployment/server management is actually needed.
- Never run `prisma db seed` automatically on every production start/redeploy. Use `npm run seed:init` only for first-time setup. Use `npm run seed:prod-safe` / `npm run db:seed` only for a safe production seed that creates missing records without updating user-managed fields.
