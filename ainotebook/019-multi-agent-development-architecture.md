# 019 — Multi-Agent Development Architecture

**Date:** 2026-04-27  
**Status:** Decided  
**Decider:** Ross

---

## Context

Two capable AI development environments are in active use:

- **Claude Code** (CLI) — persistent memory, full project context across sessions, ADR awareness, system state, BRMS application context
- **Cursor** (IDE) — native browser tool (3.0), visual editor, Design Mode, built-in agent, `/multitask` for parallel subagents

Both support Claude models. Both can write, test, and deploy code. The question is how to use them together rather than treating them as competing choices.

---

## Decision

**Claude Code is the primary orchestrator for all development work.**

**Cursor's agent is a future delegate for scoped UI tasks.**

---

## Rationale

### Why Claude Code orchestrates

Persistent context is worth more than IDE integration for orchestration work. Claude Code carries:
- Full memory across sessions (ADRs, system state, BRMS application framing, architectural decisions)
- The ability to reason across the whole system — frontend, Worker, D1 schema, cron sequence, email agents
- Continuity: the next session starts where the last one ended

Cursor's agent starts cold. It can see the open files and the repo, but it doesn't know why the heartbeat uses a 72h look-back window, or that the GitHub token is scoped to `ross0nline/acis`, or that the letter to William Hardison closes as "Ross" deliberately.

### Why Cursor's agent delegates

Cursor 3.0's browser tool, visual editor, and Design Mode make it fast for scoped UI work where the task is well-defined and the acceptance criteria are visual. Drag-and-drop DOM editing, component inspection, live layout iteration — these are better in a native IDE browser than through a headless Playwright session.

The key word is *scoped*. When Claude Code can write a brief that specifies exact file paths, acceptance criteria, and constraints, Cursor's agent can execute it precisely and return a diff. No context needed — the brief is the context.

### The analogy to ACIS itself

ACIS is architected the same way: one orchestrator (the Worker cron), specialized agents with narrow scope (scraper, heartbeat, vendor scanner, incident playbook, email agents). Each agent does one thing well. The orchestrator sequences them and owns the full picture.

The development architecture mirrors the product architecture: Claude Code orchestrates, Cursor agent executes scoped work, Playwright MCP handles verification.

---

## Implementation

### Current state
- Claude Code: primary — all orchestration, implementation, deployment
- Playwright MCP: next addition — enables Claude Code to navigate and verify `acis.rossonlineservices.com` live during sessions

### Future delegation pattern
```
Claude Code
  → identifies scoped UI task
  → writes brief (file paths, acceptance criteria, constraints)
  → delegates to Cursor agent (Claude model preferred)
  → receives diff
  → verifies via Playwright MCP
  → commits
```

### When to delegate vs. execute directly
| Task type | Claude Code handles | Cursor agent handles |
|---|---|---|
| System-wide changes | ✅ | — |
| Multi-file refactors | ✅ | — |
| New agent / Worker logic | ✅ | — |
| Schema changes | ✅ | — |
| Isolated component layout | Optional | ✅ |
| Visual iteration on a single page | Optional | ✅ |
| Accessibility audit | — | ✅ |

---

## Consequences

- Playwright MCP is the immediate next infrastructure addition (extends Claude Code verification without requiring delegation)
- Cursor agent delegation is deferred until there is sufficient UI surface to warrant it (likely admin subdomain Phase 1)
- All architectural decisions continue to be written here, in the ADR notebook — Cursor agent is an executor, not a decision-maker

---

## Related

- ADR 013 — Operations Tab (UI architecture)
- ADR 018 — GitHub PR Automation (agent outputs artifacts, not just logs)
- Memory: `feedback_claude_code_primary.md`
