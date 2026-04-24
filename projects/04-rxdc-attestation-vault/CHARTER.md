# Project 04: Gag Clause & RxDC Attestation Vault

## A. Project Charter

**Objective:** A secure tracking portal to coordinate the collection of data from internal teams and external PBMs (Pharmacy Benefit Managers) required for annual CMS submissions — specifically RxDC reporting and Gag Clause Attestation.

**Job Description Alignment:**
- Fulfills: *"Annual RxDC reporting"* (MANDATORY)
- Fulfills: *"Annual Gag Clause Attestation coordination & submission"* (MANDATORY)
- Demonstrates: *"MANDATORY knowledge of HIPAA compliance (RxDC, Gag Clause, CMS)"*

**Why it wows the hiring manager:** RxDC and Gag Clause reporting are notoriously painful administrative tasks in healthcare IT — missed deadlines trigger CMS penalties. Building an automated system that tracks 50+ partners, stores attestation documents securely, and sends reminders 30 days before the deadline proves you can handle the exact pain points of this role at scale.

---

## B. Roadmap

### Phase 1: Secure Document Storage (Cloudflare R2)
- [ ] Provision a Cloudflare R2 bucket for attestation PDFs and RxDC data files
- [ ] Implement upload endpoint (Worker) with pre-signed URL generation for secure file delivery

### Phase 2: Partner Tracking Database (Cloudflare D1)
- [ ] Schema: partner_id, name, type (PBM/employer/TPA), gag_clause_status, rxdc_status, submission_deadline, last_reminder_sent
- [ ] Seed with 50 mock partners/clients across various statuses
- [ ] Status values: "Awaiting Signature" | "Data Submitted" | "Complete" | "Overdue"

### Phase 3: Automated Reminder System (Cron Worker)
- [ ] Cron trigger: runs daily to check submission deadlines
- [ ] Send automated email reminders (via SendGrid or Mailgun) to partners with missing attestations 30 days before the CMS deadline
- [ ] Log all reminder events in D1

### Phase 4: Frontend Dashboard (Cloudflare Pages)
- [ ] Partner status table filterable by: submission type, status, deadline proximity
- [ ] Document upload interface (links to R2 pre-signed URLs)
- [ ] Compliance completion percentage summary for executive reporting

### Phase 5: CI/CD & Documentation
- [ ] GitHub Actions → Cloudflare deployment pipeline
- [ ] Generate a CMS-submission-ready summary report

---

## C. Tracking Table

| Module | Component | Status | Notes |
|---|---|---|---|
| Storage | R2 Attestation Bucket | [Uninitiated] | Encrypted storage for PDFs and RxDC files |
| Storage | Pre-signed URL Generator | [Uninitiated] | Worker endpoint for secure file upload/download |
| Database | D1 Partner Schema | [Uninitiated] | 50+ mock partners with dual-status tracking |
| Backend | Status Update Endpoint | [Uninitiated] | PATCH /partner/:id — update attestation status |
| Backend | Cron Reminder Job | [Uninitiated] | Daily check — send reminders at 30-day threshold |
| Email | SendGrid/Mailgun Integration | [Uninitiated] | Reminder templates for Gag Clause + RxDC |
| Frontend | Partner Status Dashboard | [Uninitiated] | Filterable table with deadline proximity indicators |
| Frontend | Document Upload UI | [Uninitiated] | Linked to R2 pre-signed URLs |
| Frontend | Executive Summary View | [Uninitiated] | Completion % by type + overdue count |
| DevOps | GitHub CI/CD | [Uninitiated] | Automated deploy pipeline |

---

## D. Sub-Agent Proposals

**Sub-Agent: CMS Deadline Tracker**
- Scope: Monitors official CMS publication channels for annual RxDC and Gag Clause submission deadline announcements. Updates the D1 deadline fields automatically.
- Trigger: Monthly cron check against CMS.gov.

**Sub-Agent: Reminder Email Composer**
- Scope: Generates personalized reminder emails per partner type (PBM vs. employer group) with specific instructions for their submission format.
- Output: HTML email body ready for SendGrid/Mailgun delivery.
