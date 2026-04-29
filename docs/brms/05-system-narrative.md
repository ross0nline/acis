# Building the System I Wished I Had

*A compliance operations engineering story*

---

## The Problem

Compliance operations teams work in a structural disadvantage: the volume of work that demands attention grows every year, and the tools available to manage it were not designed for that volume.

Every week the Federal Register publishes new rules from CMS, HHS, EBSA, and OCR. Regulations.gov tracks open comment periods with hard deadlines. The CMS Newsroom publishes guidance and fact sheets that never make it into any formal feed. A compliance administrator who wants to stay current has to monitor all of it — manually — and decide what matters, what requires action, and when.

That is just the monitoring problem. There is also attestation tracking for RxDC and Gag Clause obligations across client plans. Vendor security assessments with documentation requirements. Incident response documentation that needs to cite specific CFR sections. Executive reporting that requires synthesizing all of the above into a picture leadership can act on.

The tools typically in use for this work are email, spreadsheets, shared drives, and calendar reminders. This is not a failure of the people doing the work — it is a failure of the infrastructure available to them.

---

## The Design Question

When I decided to build ACIS, the first question was not "what features should it have?" It was: **what would this look like if it were designed from scratch, today, with AI as a first-class component rather than a bolt-on?**

The compliance tooling market is full of products that added AI to an existing product — a summarization button, an assistant sidebar, a report generator. These are valuable. They are not the same as designing the intelligence loop into the architecture from the beginning.

The distinction matters because the two approaches produce different systems. When you retrofit AI into a workflow, you still have the workflow — you've just made one step faster. When you build AI into the loop at the architecture level, the workflow itself changes: the system monitors, scores, and escalates continuously, and the human's job shifts from execution to review and judgment.

That is the system I set out to build.

---

## The Architecture Choices

**Serverless at the edge.** Cloudflare Workers was the only reasonable choice for a solo-built system that needed to be genuinely production-grade without managed infrastructure overhead. The compliance work is event-driven — regulatory events arrive on a schedule, attestation statuses change occasionally, incidents happen unpredictably. Serverless matches this perfectly: pay for what runs, scale to zero between events, no servers to patch or monitor. The edge location is a secondary benefit: regulatory feeds from federal APIs respond faster from a nearby edge node than from a centralized data center.

**One worker, not five.** The early plan was one Cloudflare Worker per compliance module — Regulatory Pulse, Attestation Vault, Vendor Risk, Incident Response, each with its own deployment and database. That structure would have made each module independently deployable and replaceable, which sounded correct on paper. It would have also meant four times the operational complexity for an initial version that needed to prove the concept before optimizing the architecture. The modules share a database schema, a Cloudflare D1 instance, and a single AI Gateway proxy. Keeping them together until there is a concrete reason to split them is the right call.

**Claude on the critical path, not the side path.** Some AI integrations sit outside the main data flow — you can remove them and the system still works, just with less polish. ACIS is not designed that way. Claude scores every regulatory document before it is stored. Claude generates every incident playbook before the creation response returns. Claude produces the health assessment that determines whether the daily report is Green, Yellow, or Red. If Claude is unavailable, those operations return degraded data, not alternative data. This was a deliberate choice: it forces the AI integration to be reliable and observable, not optional.

**AI Gateway as the observability layer.** Every Claude inference call is proxied through Cloudflare AI Gateway. This means every request — model used, tokens consumed, latency, input, output, success or failure — is logged in one place. The Executive Hub's Operations tab renders this log directly. The reasoning behind every risk score, every vendor assessment, every playbook is visible and auditable. This is not a nice-to-have for a compliance system. Explainability is a compliance requirement. The system had to be able to answer "why did you flag this vendor as High Risk?" with a retrievable, specific answer.

**GitHub as the content layer for the portfolio.** The portfolio viewer at `portfolio.rossonlineservices.com` fetches document content from GitHub at request time rather than building a static site or maintaining a separate content management system. This keeps the source of truth in the repository where the documents are written and version-controlled. When a document changes, pushing the commit is the only deployment step required. The `raw.githubusercontent.com` CDN delivers public repository content with no rate limits — the GitHub API is rate-limited at 60 unauthenticated requests per hour, an important distinction for a system running on shared Workers infrastructure.

---

## The Build Sequence

The system was built in a deliberate order, not by feature priority but by dependency order and confidence building.

**Database schema first.** Before any agent was written, the five-table D1 schema was designed: `regulatory_events`, `attestation_vault`, `vendor_risk`, `incidents`, `agent_memory`. The schema shapes everything else — what can be queried, what can be stored, what relationships exist between modules. Getting it wrong early means migrations later. Getting it right means the agents write to a structure that already makes sense.

**Regulatory Pulse as the foundation.** The scraper was the first agent because it generates live data that every other part of the system can reference. An attestation tracker with no regulatory context is just a status spreadsheet. A heartbeat agent that reports on zero regulatory events is not demonstrating much. The scraper runs first in the daily cron because everything else needs what it produces.

**Real scanning, not simulated scanning.** The vendor scanner performs actual TLS handshakes and HTTP header inspections against live vendor URLs. It was possible to seed the database with mock scan results. The decision not to do that was deliberate: a compliance demonstration that relies on fake security data is not a compliance demonstration. The six vendors in the system are real healthcare infrastructure vendors — including Change Healthcare, which is correctly flagged as High Risk based on its actual security posture after the 2024 breach.

**Heartbeat last.** The daily self-audit agent runs after every other agent in the cron sequence. This is not just convenient — it is semantically correct. The heartbeat asks "what is the state of the system right now?" The honest answer to that question requires that today's regulatory events have been ingested, today's vendor scans have run, and today's email notifications have fired. Running the audit before those operations would produce a report about yesterday.

---

## What the System Does Today

Every morning at 08:00 UTC, without any human initiating it:

1. The scraper contacts five federal regulatory sources — the Federal Register (CMS, EBSA, HHS feeds), Regulations.gov (CMS, HHS, EBSA, OCR agencies), and the CMS and HHS newsrooms via Firecrawl — and ingests any documents not already in the database. Claude scores each document for risk level, impacted compliance field, required remediation action, and deadline. Documents with open comment periods are elevated to a minimum Medium risk score because the deadline is real.

2. The vendor scanner checks every vendor whose last scan is older than 30 days. It performs a HEAD request to verify TLS validity, inspects six HTTP security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), computes a 0–100 score, and passes the results to Claude for a HIPAA Business Associate risk assessment framed around the specific requirements of 45 CFR § 164.314.

3. The attestation reminder checks whether any of the eight client plan records has an overdue RxDC or Gag Clause status. If any do, it sends an HTML summary email with the affected plans, the overdue fields highlighted, and the current compliance status of each.

4. The incident escalation agent checks whether any open incident has been unresolved for seven or more days. If any have, it sends a notification that includes the number of days open and a countdown to the 60-day HIPAA OCR breach notification window required by 45 CFR § 164.404. At 45 days, the subject line escalates to urgent.

5. The heartbeat agent runs 13 D1 queries in a single batch, passes the results to Claude, and receives a structured Green/Yellow/Red assessment for each of the four compliance modules. The overall status, module-level summaries, and action items are stored in the database and forwarded to the administrative layer via a Cloudflare Service Binding.

The Live Pulse panel displays the 50 most recent of {{REGULATORY_EVENT_COUNT}} real federal regulatory events ingested from federal sources, alongside 8 client attestation records, 6 vendor assessments, and 7 incidents with AI-generated NIST playbooks.

---

## What This Demonstrates

Three things.

**Domain depth.** A system that correctly implements RxDC submission tracking, Gag Clause attestation lifecycle, NIST SP 800-61 Rev 2 incident response phases, HIPAA Business Associate security requirements, and 45 CFR § 164.404 breach notification windows is not built by someone who has read a summary of those requirements. It is built by someone who has worked with them long enough to know what the edge cases are, where the deadlines actually fall, and what a compliance administrator needs to see to do their job.

**Architectural judgment.** Every design choice in ACIS has a reason: the one-worker architecture, the AI-on-the-critical-path approach, the AI Gateway as the observability layer, the GitHub-fetch portfolio strategy, the cron execution order. These are not the decisions of someone following a tutorial. They are engineering judgments made under constraints — time, budget, complexity budget — and they hold up under scrutiny.

**Initiative.** No one asked for this system to be built. There was no ticket, no sprint, no product requirements document. There was a job description, a clear picture of what the work actually involves, and the judgment that the best way to demonstrate readiness for the role was to do a version of the role — not describe it, not outline how I would approach it, but build the infrastructure and deploy it.

That is what ACIS is: a concrete answer to the question of what a compliance operations platform looks like when it is designed to work without you having to run it every day.

---

*ACIS is live at [acis.rossonlineservices.com](https://acis.rossonlineservices.com). This portfolio is at [portfolio.rossonlineservices.com](https://portfolio.rossonlineservices.com).*
