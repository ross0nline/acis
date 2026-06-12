---
title: "Content Routing Policy — Where Different Content Types Live"
type: research
domain: ccc-qoq
status: APPROVED
created: 2026-06-12
created_model: claude-sonnet-4-6
created_session: post-78e6e2b4-compaction-3
qoq_item_id: 664
sweep_count: 1
touches:
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-3, date: 2026-06-12, action: created, notes: "Written to prevent ainotebook/021-style routing errors. Formalized inline-chat.md routing table." }
---

# Content Routing Policy

The ainotebook/021 incident — internal session reflection committed to a public-facing portfolio repo — revealed that the routing table in inline-chat.md was missing two critical destinations. This document formalizes the policy.

---

## The Core Test

Before writing any substantial content, ask: **"Who is the audience?"**

| Audience | Destination |
|---|---|
| Hiring managers, clients, external reviewers | `ainotebook/` or `research/` in the relevant project repo |
| Future AI agents orienting cold | `ccc-qoq/thought-log/` |
| Private reflection, personal voice, internal ops | `.journal/` (not git-tracked) |
| The user (current session) | Chat only — no file needed |

---

## Decision Tree

```
Is this content worth preserving beyond this session?
├── No → Chat only. Done.
└── Yes → Is it portfolio-safe?
    ├── Yes → Is it a formal decision?
    │   ├── Yes → ainotebook/adr/adr-NNN-slug.md
    │   └── No → Is it analysis or trade-off exploration?
    │       ├── Yes → research/architecture/slug.md or ainotebook/analysis/
    │       └── No → Is it a session insight or lesson?
    │           └── Yes → ainotebook/reflect/reflect-NNN-slug.md
    └── No → Is it AI reasoning / "why we decided X"?
        ├── Yes → ccc-qoq/thought-log/YYYY-MM-DD-slug.md
        └── No → .journal/YYYY-MM-DD-slug.md
```

---

## Full Routing Table

| Content type | Destination | Notes |
|---|---|---|
| Architecture decision record | `ainotebook/adr/adr-NNN-slug.md` | Public-safe, numbered sequence |
| Session insight or lesson (portfolio-safe) | `ainotebook/reflect/reflect-NNN-slug.md` | Public-safe, numbered sequence |
| Trade-off analysis | `research/architecture/slug.md` | Can be linked from ainotebook |
| Design exploration / brainstorm | `C:\Users\rossonline\ccc\brainstorm\slug.md` | Cross-project brainstorm dir |
| Per-session AI reasoning ("why we decided X") | `ccc-qoq/thought-log/YYYY-MM-DD-slug.md` | Not portfolio-facing; for future agents |
| AIBuddy personal voice / internal ops reflection | `.journal/YYYY-MM-DD-slug.md` | Private, not git-tracked |
| Upwork / proposal research | `research/upwork/slug.md` | In compliance-portfolio |
| Queue item | POST /items via qoq-add | Never a file |
| Chat observation (<3 sentences) | Chat only | No file needed |

---

## The Portfolio-Safe Test

Ask: **"Would a hiring manager reading this repo understand why it's here?"**

If yes → it can go in ainotebook/ or research/  
If no → it goes in .journal/ or thought-log/, never committed to a public repo

**Red flags that signal non-portfolio content:**
- Contains internal AWS account IDs or endpoint URLs
- References agent routing decisions or session debrief language
- Mentions specific error messages from a debugging session
- Discusses internal coordination between agents
- Uses first-person AIBuddy voice about "what I learned"

---

## Canonical Examples

| Content | Where it went | Why |
|---|---|---|
| HIPAA compliance decision for ACIS attestation module | `ainotebook/adr/` | Public, architectural, decision-grade |
| Bedrock enrollment blocker — why we pivoted to Nova Pro | `ccc-qoq/thought-log/2026-06-12-bedrock-poc-session.md` | AI reasoning trace, not portfolio |
| "What Actually Happened" session reflection (021) | `.journal/2026-06-12-bedrock-poc-session-reflection.md` | Internal ops voice, AWS account IDs |
| Prior auth domain research for PreClear MD | `research/upwork/` | Portfolio-adjacent research |
| Bedrock HIPAA architecture reference | `research/upwork/bedrock-hipaa-architecture.md` | Portfolio-safe reference doc |

---

## Linked From

- `inline-chat.md` — routing table and portfolio-safe test
- `post-compaction.md` — not yet linked, should reference this
- `ainotebook/` — implied by absence of non-portfolio content there
