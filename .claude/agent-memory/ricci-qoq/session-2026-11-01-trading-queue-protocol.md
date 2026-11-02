---
name: session-2026-11-01-trading-queue-protocol
description: Advisory-only session — queue conventions for CCC-TRADING (#998) batch; found #998 is under IDEAS(150), no ccc-trading domain, typeIdByName silently nulls typos
metadata:
  type: project
  session: session_01DGmN9diG53kPBwRHrD9wFn
  date: 2026-11-01
---

## Done This Session
- Advised orchestrator on batch-creating children of #998 CCC-TRADING (phases #999-#1002). No code, no items created.

## Key Facts Learned
- #998 is NOT a root: parent_id=150 (IDEAS), domain=personal, type=milestone, stage=active. Compliant with IDEAS-staging rule; graduation = new `ccc-trading` domain row (none exists yet; domains table has 5 rows).
- `typeIdByName` (src/db/queries.ts:139) returns null on unknown type name — typo in `type` = silent type_id NULL, no error.
- POST /items with stage=done sets done_at=now (creation time), not real completion time — put actual date/commit in completion_note + git_ref.
- linked_paths format drift: queuing.md/queue-scan.md say JSON array string; qoq-add -LinkedPaths/-LinkReflect append comma-separated. Not reconciled.
- qoq-add auto-detects session from newest .jsonl in projects dir — can mismatch cloud session ids (session_01...). Pass -Session explicitly.
- Lead magnets live under #554 (LEAD MAGNETS, ccc-qoq domain), not under the project root.
- ESP32 work lives under #425 subtree (433 is done child) — link, don't duplicate.

## Open Questions
- Should `ccc-trading` become a domain (and #998 graduate out of IDEAS)? Recommended yes.
- linked_paths canonical format (JSON array vs CSV) — needs one answer + skill update.

## Next Agent: Start Here
- Check whether the trading batch was created and whether focus moved to #998/#1001.
