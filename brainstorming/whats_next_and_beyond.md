# What's Next & Beyond: ACIS Build Horizon

*Written: 2026-04-25 — based on current build state (all 4 modules + heartbeat live)*

---

## Where We Stand

All four compliance modules are live. Three agents are deployed. One item remains on the original ADR 008 roadmap:

```
✅ Regulatory Pulse        — scraper, Claude scoring, 5 sources, 64 events
✅ Attestation Vault       — full CRUD, RxDC + Gag Clause tracking
✅ Vendor Risk             — DB + API + real TLS/headers scanner (claude-opus-4-7)
✅ Incident Response       — CRUD + NIST 800-61 playbook agent
✅ Heartbeat Agent         — daily D1 audit, Green/Yellow/Red, CCC Admin reporting
🔲 Operations Tab          — Agent Logs + manual triggers in Executive Hub (ADR 013)
```

Everything below is beyond the current roadmap. Organized by impact-to-effort ratio.

---

## Tier 1 — High impact, directly on roadmap

### Operations Tab in Executive Hub
*ADR 013. The last item. Closes the demo.*

Three sections: Manual Triggers (Run Scraper, Run Heartbeat, Scan All Vendors with live output), Last Heartbeat (color-coded module status cards), Agent Logs (AI Gateway request log, Claude reasoning traces). This is the build that makes ACIS a complete demo — no terminal, no curl, one URL shows everything.

**Effort:** Medium — frontend work, but all API endpoints are already live.

---

## Tier 2 — Natural extensions, high demo value

### Attestation Email Reminders
*Originally in ACIS_synthesis as "Attestation Reminder — 30-day deadline cron + SendGrid." Never built.*

A cron that queries `attestation_vault` for clients with upcoming or overdue `rxdc_status` / `gag_clause_status` and fires a templated reminder email via Resend (or SendGrid). Targets `contact_email` on the vendor record. This is a real-world compliance workflow — healthcare administrators actually do this today.

The heartbeat already detects overdue attestations and flags them Yellow/Red. The next step is acting on that signal rather than just reporting it.

**Effort:** Low-medium — Resend has a simple REST API, one new cron task, one email template.

### R2 Document Vault — PDF Upload per Client
*R2 bucket (`acis-vault`) is already bound. `r2_folder_path` column exists in `attestation_vault`. Nothing is wired up.*

Allow uploading actual attestation PDF documents (RxDC submission confirmations, Gag Clause attestation letters) per client. The Executive Hub gets a file upload button on each attestation row. Stored at `acis-vault/{client_id}/{filename}`. Presigned URL for download.

**Effort:** Medium — R2 presigned URLs, multipart upload from Pages, one new route.

### Vendor Scanner Wired Into Daily Cron
*Vendor scans are currently on-demand only (ADR 010 decision). Worth revisiting.*

The heartbeat already flags vendors not scanned in 30+ days. The natural next step is auto-triggering `scanVendor()` for stale vendors as part of the daily cron — after the scraper, before the heartbeat. The heartbeat's `stale_30d` metric then becomes self-healing rather than just alerting.

**Effort:** Very low — ~10 lines in the `scheduled` handler. Already have `getVendors()` and `scanVendor()`.

### Incident Escalation Notifications
*Heartbeat detects `stale_open_7d > 0` but only reports it. No action is taken.*

When the heartbeat fires and finds open incidents older than 7 days, send a targeted alert: email to the compliance admin + a CCC Admin activity event. Keeps incidents from silently aging past their response window. HIPAA has a 60-day OCR notification deadline — letting incidents stall is exactly what ACIS should prevent.

**Effort:** Low — heartbeat already has the data, just needs an email + CCC Admin event on trigger.

---

## Tier 3 — Impressive extensions, moderate effort

### Playbook Agent Upgrade to claude-opus-4-7
*ADR 011 flags this as medium priority.*

The NIST 800-61 playbook generator (`src/agents/playbook.ts`) still uses `claude-sonnet-4-6`. Upgrading to `claude-opus-4-7` improves HIPAA regulatory accuracy — the difference shows most in CFR citation precision and the specificity of the 5-phase guidance for unusual incident types. One-line change, meaningful demo improvement for the incidents panel.

**Effort:** Trivial — change one model string, redeploy.

### GitHub PR Automation — Policy Update Agent
*The original "wow factor" item from ACIS_synthesis. Never built. High conceptual value.*

When the heartbeat detects a new High-risk regulatory event (e.g., a CMS bulletin changing an RxDC deadline), the agent opens a GitHub PR automatically: updates `COMPLIANCE_NOTES.md` or a policy document with the new requirement, cites the source regulatory event, and tags it for review. The hiring manager sees: "the system read a federal bulletin, understood the compliance implication, and opened a pull request."

This is the "autonomous" in ACIS fully realized. It uses the GitHub MCP (already connected) to create branches and PRs without human initiation.

**Effort:** Medium — GitHub MCP is available, the regulatory data is there, the agent logic is new.

### Regulatory Deadline Tracker
*Surfaced in ACIS_synthesis: remediation_steps stores deadlines as text. They're not queryable.*

Parse the `deadline` field out of `regulatory_events.remediation_steps` into a dedicated column (or a new `deadlines` table). Surface a calendar view in the Executive Hub: "These 3 regulatory deadlines are in the next 30 days." The scraper already extracts deadlines in its Claude output — this is a frontend + minor schema change.

**Effort:** Medium — schema migration, scraper output change, new panel component.

---

## Tier 4 — Architectural depth, longer horizon

### Agent Logs Panel Backed by Real AI Gateway Data
*Depends on Operations Tab being built first.*

ADR 005 documents the plan: Executive Hub pulls from the AI Gateway request log and renders Claude reasoning traces. The AI Gateway logs are available via Cloudflare's REST API (`/accounts/{id}/ai-gateway/gateways/{slug}/logs`). This is more technically interesting than the manual triggers — it shows the actual input/output JSON for every Claude call in a scrollable, timestamped feed.

The demo impact: a hiring manager can literally watch the system decide "this CMS bulletin is High risk because it changes the RxDC submission deadline for 2026." That's the "transparent reasoning" story.

**Effort:** Medium — Cloudflare API call from the Worker, new frontend panel.

### Durable Objects for Stateful Agent Memory
*ADR 004 (Cloudflare Agents SDK) was decided but never implemented — agent_memory is D1 key-value instead.*

The current `agent_memory` table is a flat key-value store in D1. Durable Objects (via Cloudflare Agents SDK) would allow per-session stateful agents: a vendor risk agent that remembers its conversation about a specific vendor across multiple scans, or an incident response agent that maintains context across a multi-day investigation. This is architecturally more powerful but also significantly more complex.

Worth revisiting after the Operations Tab is live. The D1 key-value approach is not wrong — it's just simpler than what ADR 004 originally envisioned.

**Effort:** High — new Durable Object class, migration of agent_memory reads/writes.

---

## Recommended Next Order

1. **Operations Tab** — closes the roadmap, makes the demo complete
2. **Playbook agent → claude-opus-4-7** — trivial, immediate quality improvement
3. **Vendor scanner in daily cron** — trivial, self-heals the heartbeat's stale vendor alert
4. **Attestation email reminders** — builds the most real-world-relevant automation
5. **GitHub PR automation** — the conversation-stopper feature for the interview demo
