---
title: "ACIS UI Screenshots — Portfolio Evidence"
type: research
domain: personal
status: COMPLETE
created: 2026-06-12
created_model: claude-sonnet-4-6
qoq_item_id: 630
---

# ACIS UI Screenshots

Captured live from https://acis.rossonlineservices.com at 1440×900. All tabs show real production data — no mocked state.

## Files

| File | Tab | Key evidence |
|---|---|---|
| `acis-live-pulse.png` | Live Pulse | 50 regulatory events, 5 high-risk flagged, AI-scored action items from CMS/HHS sources |
| `acis-attestation.png` | Attestation | 8 client plans, dual RxDC + Gag Clause tracking, status lifecycle (Pending → Submitted → Confirmed → Overdue) |
| `acis-vendor-risk.png` | Vendor Risk | Live TLS scoring, security-header grades (Change Healthcare 44/100 High Risk), AI HIPAA risk narratives |
| `acis-incidents.png` | Incidents | NIST 800-61 incident tracking, "Playbook" button per incident, PHI exposure and ransomware scenarios |
| `acis-operations.png` | Operations | **Strongest piece** — AI Gateway agent logs: claude-sonnet-4-6, token in/out, latency (4.2s), HTTP 200 |

## Proposal usage notes

- Operations tab is the clearest proof of production AI agent infrastructure — show it first in any technical conversation
- Vendor Risk + Incidents maps directly to the PreClear Scan rubric scoring concept (Pass/Partial/Fail per criterion = same mechanic as security-header scoring)
- Attestation lifecycle UI maps to PreClear session history + status tracking
- The "designed AND built solo, React + Tailwind, live in production" line can accompany any of these

## UpWork portfolio entry caption (suggested)

> ACIS — Autonomous Compliance Intelligence System. Four compliance modules, six AI agents, live at acis.rossonlineservices.com. Built solo: Cloudflare Workers + D1 + R2 + Pages, React + Tailwind frontend, Claude AI agents via Anthropic API + AI Gateway. HIPAA-domain design with PHI boundary controls throughout.
