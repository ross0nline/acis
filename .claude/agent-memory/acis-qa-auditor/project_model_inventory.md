---
name: model-inventory-and-doc-lag
description: ACIS model call sites (5 total, all in src/agents/) and the recurring pattern that docs lag code on model upgrades
metadata:
  type: project
---

As of 2026-06-12, all ACIS model call sites are correct: `claude-opus-4-8` in heartbeat.ts:53, playbook.ts:28, vendor-scanner.ts:61; `claude-sonnet-4-6` in scraper.ts:90 and scraper.ts:202. The 4.7→4.8 upgrade happened 2026-06-11 (logged in ainotebook/011). No model strings in wrangler.toml.

**Why:** Recurring pattern — code upgrades happen and ainotebook/011 gets updated, but downstream docs (ainotebook 008/010/012, docs/brms/01-system-overview.md, .claude/agents/acis-qa-auditor.md, .claude/commands/lead-magnet.md) retain stale model IDs. docs/brms/ is BRMS-facing, so staleness there hurts credibility most.

**How to apply:** On any model-upgrade audit, grep the whole repo (not just src/) for old model IDs; treat src/ as likely-already-fixed and docs as likely-stale. Also note: all 5 call sites hardcode the model string inline and duplicate the same ```json fence-strip + JSON.parse pattern — a shared MODELS constant + parseClaudeJson helper is a standing refactor candidate.
