# 011 — Claude API Usage Inventory

**Date:** 2026-04-25  
**Status:** Reference — updated as agents are added or models change

---

## Current API Surface

All Claude calls go through the Cloudflare AI Gateway (`acis-gateway`) via the `AI_GATEWAY_URL` env var set as the `baseURL` on the Anthropic client. This gives request logging, latency tracking, and cost visibility across every agent.

```mermaid
flowchart LR
    scraper["scraper.ts\nclaude-sonnet-4-6"]
    playbook["playbook.ts\nclaude-opus-4-7"]
    scanner["vendor-scanner.ts\nclaude-opus-4-7"]
    heartbeat["heartbeat.ts\nclaude-opus-4-7"]

    scraper -->|scoreWithClaude| GW["AI Gateway\nacis-gateway"]
    scraper -->|parseNewsroomMarkdown| GW
    playbook -->|generatePlaybook| GW
    scanner -->|scanVendor| GW
    heartbeat -->|runHeartbeat| GW
    GW --> API["Anthropic API"]
```

---

## Agent Inventory

### `src/agents/scraper.ts` — `claude-sonnet-4-6`

**Call 1 — `scoreWithClaude()`**  
Scores a single regulatory document against HIPAA/compliance frameworks.  
- Input: title, summary, source, URL (truncated to 300 chars)  
- Output: `RiskScoreOutput` — `risk_level`, `impacted_field`, `summary`, `remediation_step`, `deadline`  
- `max_tokens: 512`  
- Called once per document ingested; volume scales with cron run (typically 10–30 calls/day)

**Call 2 — `parseNewsroomMarkdown()`**  
Extracts structured article objects from raw Firecrawl markdown dumps of CMS and HHS press rooms.  
- Input: full markdown page content (truncated to 8,000 chars), source label  
- Output: `ParsedNewsItem[]` — `title`, `url`, `published_date`, `summary`  
- `max_tokens: 2048`  
- Called twice per cron run (once per Firecrawl source: CMS Newsroom, HHS Press Room)

---

### `src/agents/playbook.ts` — `claude-opus-4-7`

**Call — `generatePlaybook()`**  
Generates a structured NIST SP 800-61 Rev 2 incident response playbook.  
- Input: `incident_type`, `description` (truncated to 800 chars), `reporter`  
- Output: `IncidentPlaybook` — severity, HIPAA reportability, OCR deadline, 5 NIST phases, CFR citations, escalation contacts  
- `max_tokens: 2048`  
- Called synchronously on every `POST /api/incidents`; also on `POST /api/incidents/:id/playbook` (admin-triggered regeneration)  
- Upgraded from `claude-sonnet-4-6` on 2026-04-25 for improved CFR citation precision (see ADR 009, ADR 011)

---

### `src/agents/heartbeat.ts` — `claude-opus-4-7`

**Call — `runHeartbeat()`**  
Audits all four compliance modules and produces a system health report.  
- Input: 13 D1 metrics — recent events, high-risk events, overdue attestations, high-risk vendors, stale incidents, unscanned vendors  
- Output: `HeartbeatReport` — `overall_status` (Green/Yellow/Red), per-module status + summary, `action_items[]`  
- `max_tokens: 1024`  
- Runs daily after the scraper in the `scheduled()` handler; also on `POST /api/heartbeat/run` (admin auth)  
- Persists report to `agent_memory` key `last_heartbeat`; POSTs activity event to CCC Admin via Service Binding

---

### `src/agents/vendor-scanner.ts` — `claude-opus-4-7`

**Call — `scanVendor()`**  
Assesses vendor security posture as a HIPAA Business Associate.  
- Input: vendor name, URL, TLS valid flag, headers_score (0–100), lists of headers present/missing  
- Output: `ai_risk_summary` (2–3 sentences), `overall_status` (Approved / Requires Review / High Risk / Pending Review)  
- `max_tokens: 512`  
- Called on `POST /api/vendors/:id/scan` and for each vendor in `POST /api/vendors/scan-all`  
- See ADR 010 for design rationale

---

## Model Version Summary

| Agent | Model | Notes |
|---|---|---|
| scraper — scoreWithClaude | claude-sonnet-4-6 | Appropriate — high-volume classification; cost-efficient |
| scraper — parseNewsroomMarkdown | claude-sonnet-4-6 | Appropriate — structured extraction; `max_tokens` bumped 1024→2048 on 2026-04-25 to prevent JSON truncation |
| playbook — generatePlaybook | claude-opus-4-7 | Upgraded 2026-04-25 — improved CFR citation precision |
| vendor-scanner — scanVendor | claude-opus-4-7 | Current |
| heartbeat — runHeartbeat | claude-opus-4-7 | Current |

---

## Cost Profile (estimated, daily cron)

| Agent | Calls/Day | Model | Input est. | Output est. |
|---|---|---|---|---|
| scoreWithClaude | ~20 | Sonnet 4.6 | ~15K tokens | ~5K tokens |
| parseNewsroomMarkdown | 2 | Sonnet 4.6 | ~16K tokens | ~4K tokens |
| runHeartbeat | 1 | Opus 4.7 | ~2K tokens | ~1K tokens |
| generatePlaybook | on incident creation (rare) | Opus 4.7 | ~1K tokens | ~2K tokens |
| scanVendor | on demand / stale-vendor cron | Opus 4.7 | ~0.5K tokens | ~0.2K tokens |

Daily cron cost is dominated by the scraper (~$0.11/day at current volume). Heartbeat adds ~$0.03/day. Playbook and vendor scan are negligible at demo scale.
