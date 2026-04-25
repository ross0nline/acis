# 013 — Operations Tab: Admin Controls in the Executive Hub

**Date:** 2026-04-25  
**Status:** Decided & Implemented — Operations tab live at acis.rossonlineservices.com; CF_API_TOKEN set, Agent Logs streaming active

---

## Decision

All manual admin controls and the Agent Logs panel live in a dedicated **Operations tab** inside the existing ACIS Executive Hub (`acis-executive-hub.pages.dev`). This is the final remaining build item from ADR 008 and closes the demo story: one URL, all modules, all AI agents, full operator control.

---

## Context

As ACIS gained triggerable operations (scraper, heartbeat, vendor scanner, playbook regeneration), the question became where to surface them. Three options were evaluated:

1. Operations tab inside the existing Executive Hub
2. CCC Admin dashboard controls (inverted Service Binding)
3. Standalone admin Worker / page

---

## Decision Details

### Option 1 (chosen): Operations tab in the Executive Hub

The demo happens at the Executive Hub. A hiring manager reviewing ACIS should be able to, in a single tab:
- See all compliance data (existing panels)
- Trigger live AI operations and watch results update
- Read the AI reasoning trace behind every Claude call
- View the last heartbeat report with color-coded module statuses

Adding an **Operations** tab achieves this without any new project, deployment, or URL. The tab is gated behind the same `ADMIN_TOKEN` pattern used by every write endpoint — no new auth surface.

**Planned sections inside the Operations tab:**

| Section | What it shows / does |
|---|---|
| Manual Triggers | Run Scraper, Run Heartbeat, Scan All Vendors — each with live output rendered inline |
| Last Heartbeat | Renders the stored `HeartbeatReport` with Green/Yellow/Red badges per module and action items |
| Agent Logs | AI Gateway request log — Claude reasoning traces for every agent call (ADR 008 final item) |

The Agent Logs panel belongs here, not in a separate tab, because it's an operational view — it answers "what did Claude do and why?" for the person running the system, not a compliance report for a client.

### Option 2 (rejected): CCC Admin dashboard controls

The `CCC_ADMIN` Service Binding currently flows **one direction** — ACIS pushes events and heartbeat summaries to CCC Admin. Inverting this (CCC Admin calls back into ACIS to trigger operations) would:

- Couple the ACIS demo to CCC Admin's availability
- Require new inbound-service-binding routes for every operation CCC Admin needs to trigger
- Split the demo across two dashboards

The cleaner boundary: CCC Admin is the **notification sink**, ACIS Executive Hub is the **control plane**. CCC Admin receives heartbeat reports and high-priority alerts; it does not drive ACIS operations.

### Option 3 (rejected): Standalone admin Worker / page

Adds a project, a deployment, and a second URL with no meaningful advantage. Dismissed.

---

## What This Closes

With the Operations tab built, the Executive Hub becomes the complete ACIS interface:

```
Executive Hub tabs:
  Regulatory Pulse  |  Attestation Vault  |  Vendor Risk  |  Incident Tracker  |  Operations
```

- Every compliance module has a data panel
- Every AI agent is triggerable by hand
- Every Claude reasoning trace is visible
- The last heartbeat is always one click away

This is the full "Autonomous Compliance Intelligence System" demo — no terminal, no curl, no separate tools.
