---
description: x.x.x versioning convention for the Sovereign Duo — family tree naming, when to bump, version vs sweep_count, which files get versioning. Synced from ccc-qoq versioning skill.
disable-model-invocation: false
shell: powershell
argument-hint: []
title: "Versioning Skill"
domain: ccc-qoq
status: APPROVED
source_of_truth: ccc-qoq
type: skill
version: "0.1.0"
created: 2026-06-12
created_model: claude-sonnet-4-6
created_session: post-78e6e2b4-compaction-4
sweep_count: 1
tags: [skill, versioning, dna, x.x.x, family-tree, convention]
qoq_item_id: 388
---

# /versioning — x.x.x Family Tree Convention

**Canonical location:** `C:\Users\rossonline\ccc\ccc-qoq\.claude\skills\versioning\SKILL.md`  
**Full design:** `brainstorm/versioning-system.md`

---

## The Family Tree Format

**Starting version: `0.1.0`** — never `1.0.0`. The leading `0` means beta: still being built or iterated. `1.0.0` means "first stable, tested, complete generation is ready."

```
0.1.0   — First beta capability; exists but still developing
0.x.0   — Each additional beta capability layer
0.x.x   — Refinement or fix within a beta layer
1.0.0   — First complete, stable, production-ready generation
1.x.x   — Stable refinements and extensions
2.0.0   — Second-generation rebuild
```

This is **not semver**. It is a **family tree**: each dot-level represents a scope of change. Ideas spawn child ideas at a new depth level.

---

## When to Bump

| Change type | Version bump |
|---|---|
| New section / new capability | Bump minor: `0.1.0` → `0.2.0` |
| Bug fix / accuracy correction | Bump patch: `0.1.0` → `0.1.1` |
| Reformatted with no behavior change | No bump (just sweep) |
| Complete redesign from scratch | New major: `0.x.x` → `1.0.0` |

**The same-edit rule applies:** version + sweep_count + touch record must update in ONE Edit call.

---

## Version vs Sweep Count — Orthogonal

| Field | Tracks | Increments When |
|---|---|---|
| `version` | Intentional capability milestones | You decide something meaningfully changed |
| `sweep_count` | Total touches / review passes | Any time the file is touched |

---

## Which Files Get Versioning

| File type | Version? |
|---|---|
| Scripts (`*.ps1`) | Yes — capability milestones |
| Skills (`*.md` in `.claude/commands/`) | Yes — behavior changes |
| Research docs | Optional — major conceptual rewrites only |
| ADRs (ainotebook/) | No — supersede, don't edit |
| Context/index files | No |

---

## DNA Frontmatter with Version Field

```yaml
---
title: "Skill Name"
domain: ccc-qoq
status: APPROVED
type: skill
version: "0.2.0"       ← bump when behavior changes
sweep_count: 3          ← always = touches.length
created: 2026-06-09
created_model: claude-sonnet-4-6
created_session: session-id
touches:
  - { model: ..., session: ..., date: ..., action: created }
  - { model: ..., session: ..., date: ..., action: updated, notes: "Added X capability — bump to 0.2.0" }
  - { model: ..., session: ..., date: ..., action: swept, notes: "Fixed stale reference" }
---
```

<!-- dna-touches
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-4, date: 2026-06-12, action: created, notes: "Synced from ccc-qoq .claude/skills/versioning/SKILL.md" }
-->