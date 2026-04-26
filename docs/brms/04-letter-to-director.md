# Letter to William Hardison, Director of IT

---

William Hardison  
Director of Information Technology  
BRMS  
80 Iron Point Circle, Suite 200  
Folsom, CA 95630

---

Dear Mr. Hardison,

I am writing to express my interest in the Security Compliance Administrator II position and to share something I built specifically in the context of the work your team does.

The position description is precise about what it requires: HIPAA compliance management, RxDC and Gag Clause oversight, vendor risk, incident response, and the ability to report compliance status to executive leadership. I have spent years doing exactly this work. Rather than describe it, I built a system that does it — and deployed it to production infrastructure so you can see it running.

**ACIS** (Autonomous Compliance Intelligence System) is live at **https://acis.rossonlineservices.com**.

It monitors five federal regulatory sources daily — the Federal Register, Regulations.gov, the CMS Newsroom, and the HHS Press Room — and uses Claude AI to score every document for risk level, regulatory impact, and required action. It tracks RxDC submission status and Gag Clause attestation status for client plans with a lifecycle that mirrors how your team actually manages those obligations. It assesses vendor security posture with real TLS verification and HTTP security header analysis, then produces a HIPAA Business Associate risk assessment for each vendor. When an incident is opened, it generates a complete NIST SP 800-61 Rev 2 response playbook — with HIPAA reportability determination, a 60-day OCR deadline calculation, CFR citations, and escalation contacts — before the creation screen finishes loading.

Every morning at 08:00 UTC, the system audits itself: checks for overdue attestations, stale incidents, vendors due for rescanning, and new high-risk regulatory events. It produces a Green/Yellow/Red health report and forwards it to the administrative layer. Every Claude inference call is logged through the Cloudflare AI Gateway and rendered in the Operations panel — model used, token count, latency, and the full input and output for every risk scoring decision, vendor assessment, and incident playbook generation. The reasoning is visible. It is not a black box.

I am not describing a concept. I am describing a deployed system. You can open the Live Pulse tab and see 64 real federal regulatory events, Claude-scored, with remediation steps. You can open the Attestation panel and see RxDC and Gag Clause completion percentages. You can open an incident and read a NIST playbook that cites the specific CFR sections that apply.

I built this because I believe the role you are hiring for is changing. The compliance administrator of the next five years will not spend their day reading federal bulletins, updating spreadsheets, and manually drafting playbooks. They will spend it reviewing what an autonomous system surfaces, acting on what it escalates, and using the hours recovered to engage more deeply with the cross-functional work — with IT, Legal, Risk Management, and leadership — that no system can replace.

That is what I want to bring to BRMS. Not just the ability to manage your compliance program, but the ability to build infrastructure that makes your compliance program operate at a different level.

I would welcome the opportunity to walk you through ACIS directly, answer questions about the technical and regulatory decisions behind it, and discuss how it could be adapted for BRMS's specific environment. I am based in the area and available at your convenience.

Thank you for your time.

Sincerely,

Ross  
rossonlineservices@gmail.com  
https://acis.rossonlineservices.com

---

*P.S. — The system is fully open for exploration. There is no demo mode or sanitized data view. The regulatory events are pulled from real federal sources. The vendor scan results reflect real security assessments. The incident playbooks cite real CFR sections. If you find something that doesn't look right or could be more accurate, I would genuinely like to know — that kind of feedback is exactly what the role requires.*
