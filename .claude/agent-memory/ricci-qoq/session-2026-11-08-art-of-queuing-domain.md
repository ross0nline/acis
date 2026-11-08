---
name: session-2026-11-08-art-of-queuing-domain
description: Wrote art-of-queuing.md practitioner guide (#1114); created art-of-queuing domain id 7 via migration 0028; #1114 re-rooted top-of-tree; ccc-trading id 6 orphan found
metadata:
  type: project
  session: 78e6e2b4-34df-4c73-852c-d71397a90c55
  date: 2026-11-08
---

## Done This Session
- Wrote `ccc-qoq/research/philosophy/art-of-queuing.md` (v0.1.0 DRAFT, 9 sections + traps + source-drift list).
- Mid-task, Ross (relayed by the coordinator) asked to make Art of Queuing its own domain sitting above all the others. Wrote and applied `migrations/0028_domain_art_of_queuing.sql`, which adds domain `art-of-queuing` with id=7 and sort_order=-1.
- #1114 re-rooted: parent NULL, domain 7, priority 0. The prompt said priority was "already 0", but it was actually 2. Roots sort by priority, and CCC-QOQ=0.125.
- Added art-of-queuing routing to queue-taxonomy.md §5 and queuing/SKILL.md. Editing .claude/skills/ was allowed this time.
- Children #1115 (skill refs), #1116 (validate, then APPROVED), #1117 (domain drift + MCP/UI lists). Commit 47d5884 (not pushed).

## Key Facts Learned
- A domain root is just a queue_items row with parent_id NULL plus a domain_id. Nothing enforces a domain-to-root link; items.ts:137 resolves the root by `d.name = ? AND parent_id IS NULL`.
- Domains are data-driven, so adding a row is enough for the API. Only mcp.ts:178 (describe string) and ui.ts:168 (option list) hardcode the 5 names.
- D1 domains already had **ccc-trading id 6**: no migration, no root item. The taxonomy and memories say 5 domains, which is wrong.
- Fixed since last time: `POST /dna/file` with session_id works (the earlier 500 is gone). `POST /dna/session` needs `session_id`, not `session_uuid`.
- qoq-add `-File` with a JSON array accepts type/title_short/tags/linked_paths/parent_id per item and stamps protocol_version 1.0.

## Open Questions
- ccc-trading id 6: give it a root item, or deactivate it? (#1117)
- Should art-of-queuing items migrate out of ccc-qoq (e.g., #846 Skill Improvements)?

## Next Agent: Start Here
- #1116 first: verify the doc's claims, then promote it to APPROVED. Next migration = 0029.
