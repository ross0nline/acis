---
name: session-2026-06-19-autonomous-fix
description: Autonomous 5-task fix session — MCP create_item parity, ctx.waitUntil cascade, v_sweep_mismatch view, dna_sessions.id doc fix, KV-key naming audit
metadata:
  type: project
  session: ricci-autonomous-fix-2026-06-19
  date: 2026-06-19
---

## Done This Session

All 5 tasks completed, tsc clean, 4 commits pushed to master (auto-deploys on Cloudflare).

- **Task 1 / #900 (DONE)** — MCP `create_item` parity with REST `createHandler`. Fixed 4 gaps in `src/handlers/mcp.ts`:
  - `syncItemTags(env.DB, result.id, tags ?? null)` now called after INSERT
  - `triggerGeneration` now fired after create (KV cascade)
  - `session_id` column added to INSERT, bound from `metadata?.session_id` (MCP carries session_id inside the provenance metadata object — there is no dedicated MCP input field for it)
  - Domain root guard mirrored from REST (#642): when `parent_id === undefined && domain`, parent auto-resolves to the domain root node
- **Task 2 / #896 (DONE)** — `ctx.waitUntil()` generation cascade per D001. `handleItems` signature now takes `ctx: ExecutionContext` (4th param); `index.ts` passes `ctx`; `createHandler` and `updateHandler` use `ctx.waitUntil(triggerGeneration(...))` (removed from `Promise.all`, logEvent still awaited). MCP `create_item` + `patch_item` stay `await`-inline with a TODO referencing #896 (no ExecutionContext on the MCP path).
- **Task 3 / #897 (DONE)** — `migrations/0017_v_sweep_mismatch.sql` created AND applied live to `ccc-qoq-db` (f405cc09-...) via Cloudflare D1 MCP. View verified returning rows.
- **Task 4 (DONE, doc-only)** — `dna_sessions.id` type disagreement resolved. Tiebreaker `migrations/0002_dna_tables.sql` = `INTEGER PRIMARY KEY AUTOINCREMENT` + separate `session_id TEXT UNIQUE`. Wrong doc was `research/architecture/ccc-qoq-system-design.md` (had `id TEXT PRIMARY KEY`). Corrected inline (append method) with a CORRECTION comment; bumped sweep_count 3→4; footer touch added.
- **Task 5 (DONE, doc-only)** — KV-key naming audit. Convention documented in `research/compact/system-state.md`; sweep_count 4→5; footer touch added.

Commits: 146d9c2 (Task 1+2), 9d43a4a (Task 3), e1a8790 (Task 4), 859e2f3 (Task 5). Pushed c18ac6a..859e2f3.
DNA touches registered for all 6 files (dna_files ids: 604, 275, 3, 6, 118, 128).

## Key Facts Learned

- **`v_sweep_mismatch` immediately surfaced real drift**: the D1-side `dna_files.sweep_count` column is largely 0 (never backfilled) while `dna_touches` rows accumulated. This is SEPARATE from the file-frontmatter `sweep_count` the Stop hook / dna-sweep-check maintain. The D1 column only increments when `POST /dna/file` action IN ('reviewed','swept') — and almost no touches use those actions, so the column sits near 0. The view is correct; the data drift is the real signal. **Open: D1-side sweep_count backfill is unaddressed** — see Open Questions.
- **MCP path has no ExecutionContext**: `createMcpFetch(env)` is called with `(request, env, ctx)` in index.ts, but `buildServer` closes over `env` only — `ctx` is not threaded into the tool handlers. So MCP create/patch cannot use `ctx.waitUntil` without refactoring `createMcpFetch`/`buildServer` to capture ctx. Left as TODO #896.
- **KV-key naming canonical form = `generated:<slug>`** with NO `domain:` infix. `generate.ts` writes `generated:${domain}`. `handleGenerated()` in index.ts accepts both `/generated/domain/<slug>` and `/generated/<slug>` and resolves both to `generated:<slug>`. `generated:domain:<slug>` is never a real key — the `/domain/` URL segment is sugar.
- **ccc-qoq-system-design.md is a pre-build draft** with a different (earlier) column set for dna_sessions than what shipped (`started_at`/`ended_at` vs shipped `date`). It already carries a SUPERSEDED banner pointing to the compact. Only the id-type line was corrected, not the whole block — the block is historical.

## Open Questions

- **D1-side `dna_files.sweep_count` backfill**: should there be a one-time reconciliation that sets `sweep_count = COUNT(dna_touches)` for drifted rows, OR is the D1 column meant to track only formal reviews (reviewed/swept actions) and thus legitimately near-0? The frontmatter sweep_count and D1 sweep_count measure different things. Worth a queue item to decide the intended semantics before anyone "fixes" the drift the view now exposes.
- **MCP ctx threading (#896 remainder)**: refactor `createMcpFetch`/`buildServer` to capture `ctx` so MCP create/patch can also use `waitUntil`. Lower priority (MCP is lower-throughput).

## Next Agent: Start Here

- Verify deploy landed: `GET /health` should still report v0.9.0 (WORKER_VERSION not bumped this session — fixes only). Note `/health` was previously reported as hardcoded 'v0.6.0' stale in an earlier audit; confirm whether it now reads WORKER_VERSION.
- Consider queuing the **D1 sweep_count semantics decision** (Open Question above) — the new `v_sweep_mismatch` view makes the drift visible, so the question is now actionable.
- The prior session's `fd316e2` (title_short fix + WORKER_VERSION wiring) plus this session's 4 commits are all pushed — title_short fix is now live via this push if it wasn't deployed before.
- PATCH `domain` double-append bug (system-state.md line ~115/119) is still open — harmless dup but untouched this session.

---

## Follow-up session (same day, 2026-06-19) — ricci-followup-fix

Two more Ross-directed fixes. Commit `e4fa2dd`, pushed `859e2f3..e4fa2dd`. tsc clean. WORKER_VERSION stays v0.9.0.

### Done
- **#903 (DONE)** — `dna_files.sweep_count` now increments on EVERY `POST /dna/file`. Ross resolved the Open Question from this session's parent entry: D1 `sweep_count` = total touch count, same semantics as frontmatter sweep_count (GEMI/Ross each increment when they touch a doc). `handleDnaFile` UPSERT in `src/handlers/dna.ts`: ON CONFLICT clause changed from `CASE WHEN ? IN ('reviewed','swept') THEN +1 ELSE same` to unconditional `sweep_count = dna_files.sweep_count + 1`. Removed the now-unused trailing `action` bind param. Created #903 via MCP, closed it with completion_note.
- **#902 (DONE)** — `ExecutionContext` threaded through MCP path (the #896 remainder). `src/handlers/mcp.ts`: `buildServer(env)` -> `buildServer(env, ctx)`; `createMcpFetch(env)` -> `createMcpFetch(env, ctx)` passes ctx to buildServer; `create_item` + `patch_item` now `ctx.waitUntil(triggerGeneration(...))` instead of inline `await`; both TODO comments removed. `src/index.ts` MCP route (~line 180): `createMcpFetch(env, ctx)(request, env, ctx)`. #902 was a real pre-existing item (priority 5), not a dup — closed the tracked one.

### Key Facts
- **First insert still lands sweep_count at DEFAULT 0** — the INSERT column list does NOT include sweep_count, so a brand-new file's creating touch is the baseline (0) and every subsequent `/dna/file` increments. Matches frontmatter behavior (creating touch = baseline). Only the ON CONFLICT path increments.
- **D001 narrative tension (worth reconciling, not a bug):** `migrations/0017_v_sweep_mismatch.sql` header comment cites D001 as deciding `sweep_count` stays *client-maintained* and is NOT moved server-side. The #903 fix makes the **handler** (server-side) increment `dna_files.sweep_count` on every call — opposite of that narrative. In practice they reconcile: each `/dna/file` appends one `dna_touches` row AND +1 to the column, so new files stay in lockstep (zero drift); old records (column sat at 0) still show as drift = correct historical signal. NOTE: D001 / the dna-master-database.md doc may want a banner clarifying that `dna_files.sweep_count` is now server-incremented while the *frontmatter* sweep_count + `queue_items.sweep_count` remain client/Stop-hook-maintained. The view still works either way (it just compares recorded vs COUNT(touches)).
- **Cloudflare D1 MCP renderer collapses all SELECT rows to `[object Object]`** in this harness — queries succeed (no error) but row data is unreadable. Verify view/data correctness via the migration .sql on disk + the fact the query didn't error, not via reading MCP row output.

### DNA touches
- Posted `updated` touches for `src/handlers/dna.ts`, `src/handlers/mcp.ts`, `src/index.ts` to live worker (HTTP 200 x3), model claude-opus-4-8, session ricci-followup-fix-2026-06-19. These are the first real exercise of the #903 fix — each one increments the respective dna_files.sweep_count by 1.

### Next Agent: Start Here
- Consider a doc banner on `research/architecture/dna-master-database.md` (D001 section) clarifying server-vs-client sweep_count ownership split (see Key Facts tension above). Low priority — code is correct, only the narrative drifts.
- Old dna_files rows will keep showing in `v_sweep_mismatch` until/unless a one-time backfill sets `sweep_count = COUNT(dna_touches)`. Still undecided whether to backfill or leave as historical record. The #903 decision only fixed go-forward semantics, not the backlog.
