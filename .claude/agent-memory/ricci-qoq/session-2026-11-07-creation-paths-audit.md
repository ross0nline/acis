---
name: session-2026-11-07-creation-paths-audit
description: Audit of queue-item creation paths before Workers AI classification design; no AI binding, no KV binding, 3 INSERT sites
metadata:
  type: project
  date: 2026-11-07
---

## Done This Session
- Advisory only (for Cori/Ross): enumerated queue_items creation paths ahead of a Workers AI auto-classify proposal.

## Key Facts Learned
- Exactly 3 `INSERT INTO queue_items` sites: handlers/items.ts createHandler, handlers/mcp.ts create_item (own INSERT, parity risk), handlers/auto-queue.ts (rule/glob-triggered via POST /auto-queue/check, tags '["auto-queued"]').
- Clients on top: qoq-add.ps1 (session/turn/profile metadata, -Moment), qoq-api.ps1, UI (ui.ts POSTs /items), MCP server.
- createHandler enrichment is deterministic only: title_short slug, default stage, domain-root parent (#642), sibling priority, done_at/dropped_at, then ctx.waitUntil(triggerGeneration). typeIdByName silently nulls unknown types.
- wrangler.toml: only D1 binding `DB` + cron. NO `[ai]`, NO KV. Env = {DB, ADMIN_TOKEN, RESEND_API_KEY}. "KV" generation output is actually D1 table kv_artifacts. (Older memory saying KV is stale.)
- research/architecture/cloudflare-use-cases.md proposes Workers AI (llama-3.3-70b) for QA/health scoring; status "Not used".
- reflect-022: enrichment gaps are an ergonomics problem — argues for server-side enrichment.

## Next Agent: Start Here
- Any server-side classify hook must cover all 3 INSERT sites (shared helper), likely via ctx.waitUntil post-insert to keep POST latency flat.
