---
created_session: post-78e6e2b4-compaction-6
sweep_count: 1
touches:
  - { session: post-78e6e2b4-compaction-6, action: created, model: claude-sonnet-4-6 }
---
# ADR-021: Model Constants Centralization

**Date:** 2026-06-12  
**Status:** Accepted  
**Author:** AIBuddy

---

## Context

ACIS uses four Claude AI agents across the compliance pipeline: scraper (regulatory ingestion), vendor-scanner (HIPAA BAA assessment), heartbeat (daily self-audit), and playbook (NIST incident response). Each agent was originally hardcoded with its model string inline — `'claude-opus-4-8'` or `'claude-sonnet-4-6'` scattered across four separate files.

When the model was upgraded from `claude-opus-4-7` to `claude-opus-4-8`, it required a grep-and-replace across all agent files. With four agents in production and more planned, this creates ongoing maintenance risk: a missed string produces a version mismatch that is invisible until the model endpoint actually changes behavior.

---

## Decision

Centralize all model strings in `src/config/models.ts`:

```typescript
export const OPUS_MODEL = 'claude-opus-4-8' as const;
export const SONNET_MODEL = 'claude-sonnet-4-6' as const;
```

All agents import from this single source:

```typescript
import { OPUS_MODEL } from '../config/models';
// ...
model: OPUS_MODEL,
```

The `as const` assertion ensures the type is the literal string — no `string` broadening, no accidental runtime mutation.

---

## Agent Model Assignment

| Agent | Model | Rationale |
|---|---|---|
| `scraper.ts` | `SONNET_MODEL` | High-volume, runs on 100+ documents daily; Sonnet cost/quality ratio appropriate for classification |
| `vendor-scanner.ts` | `OPUS_MODEL` | HIPAA BAA risk assessments require precise regulatory language and nuanced risk reasoning |
| `heartbeat.ts` | `OPUS_MODEL` | Multi-module audit synthesis requires strong cross-domain reasoning |
| `playbook.ts` | `OPUS_MODEL` | NIST 800-61 playbooks with CFR citations require the highest accuracy |

---

## Consequences

**Positive:**
- Model upgrades are a single-file change — no grep required
- TypeScript `as const` makes model strings nominal types — the compiler flags any accidental string at a model parameter
- Future agents default to importing the constant rather than hardcoding — the pattern is established
- Easier to A/B test models: create `OPUS_MODEL_EXPERIMENT = 'claude-opus-4-8'` in one place

**Negative:**
- Circular import risk if `models.ts` ever imports from another module (currently impossible — it's pure constants)
- All agents must be updated when a model is retired — but this was already true; now the update is in one place

---

## Related ADRs

- **ADR-019** — Multi-agent development architecture (defines which work is done by Claude Code vs. delegated agents)
- **ADR-011** — Claude API usage inventory (lists all inference calls; model strings flow from this ADR)
