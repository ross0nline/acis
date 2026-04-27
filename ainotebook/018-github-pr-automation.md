# 018 — GitHub PR Automation: High-Risk Regulatory Events → Pull Requests

**Date:** 2026-04-27  
**Status:** Decided & Implemented

---

## Decision

When the ACIS regulatory scraper ingests an event with `risk_score ≥ 8` (High), it automatically creates a GitHub branch, writes a compliance alert file, and opens a pull request in `ross0nline/acis` via the GitHub REST API. The compliance administrator reviews and merges — ACIS surfaces, the human decides.

## Implementation

**New file:** `src/services/github.ts`

- `createCompliancePR(env, event, scored)` — full pipeline: fetch base SHA → create branch → upload file → open PR
- Branch naming: `compliance/alert-{YYYY-MM-DD}-{event_id}` — idempotent; 422 on branch or file creation means already exists, skips cleanly
- Alert file path: `docs/compliance-alerts/{date}-{slug}.md`
- PR title: `[COMPLIANCE ALERT] {title} (Risk: {score}/10)`
- PR body: source, risk score, HIPAA impact area, deadline (if present), Claude's summary, required remediation action, link to federal source, auto-generated attribution

**Scraper integration** (`src/agents/scraper.ts`):
- All three source pipelines (Federal Register, Regulations.gov, Firecrawl) check `risk_score >= 8` after insert
- `createCompliancePR` is fire-and-forget via `.catch(() => undefined)` — GitHub failure never blocks ingestion
- `insertRegulatoryEvent` was updated to return `last_row_id` (previously `void`) to support branch naming

**Demo endpoint:** `POST /api/scraper/demo-pr` — admin-only; queries the highest-risk existing event and fires PR creation. Useful for testing and demonstrations without waiting for a live scraper run.

**Secret:** `GITHUB_TOKEN` — fine-grained PAT scoped to `ross0nline/acis`, permissions: Contents R/W + Pull Requests R/W.

## Alternatives Considered

**GitHub MCP from Claude Code** — could open PRs interactively during sessions, but offers no autonomous operation. Requires a human to invoke Claude. The goal was autonomous response to federal events, not assisted response.

**GitHub Actions** — could trigger on scraper output written to a file or D1. More infrastructure, no benefit over direct REST API calls from the Worker. Workers can call the GitHub API natively.

**Merge to master automatically** — rejected. Compliance alerts require human review before they become documentation of record. The PR as an artifact — open, pending review — is the correct model.

## Design Decisions

**Why fire-and-forget?** The scraper's job is ingestion. A GitHub API failure (rate limit, token expiry, network issue) should not cause a scraper run to fail or retry. The ingestion count is what matters for daily operation; the PR is a bonus output.

**Why `risk_score ≥ 8`?** The scoring model produces 9 for High and 5 for Medium. A threshold of 8 catches all High events and nothing else. No Medium events get PRs — they accumulate in the database and are reviewed via the Executive Hub.

**Why leave the PR open?** The portfolio positioning rationale: a compliance administrator reviews and merges. The open PR at `ross0nline/acis#1` is the demo artifact — real federal document, real Claude assessment, real GitHub PR, all generated without human intervention in the ingestion path.

## Demo Artifact

PR #1 in `ross0nline/acis`:
- **Title:** `[COMPLIANCE ALERT] Patient Protection and Affordable Care Act, HHS Notice of Be (Risk: 9/10)`
- **Source:** REG-GOV/HHS
- **Event:** HHS Notice of Benefit and Payment Parameters for 2027 — Correction
- **Branch:** `compliance/alert-2026-04-27-48`
- **Status:** Open — pending review
