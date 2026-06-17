---
title: "Prior Authorization Domain Research — PreClear MD Video Call Prep"
type: research
domain: personal
status: DRAFT
created: 2026-06-12
created_model: claude-sonnet-4-6
created_session: post-78e6e2b4-compaction-3
qoq_item_id: 632
sweep_count: 1
---

# Prior Authorization Domain Research — PreClear MD Video Call Prep

## CMS-0057-F: The Federal Mandate Driving This Market

**What it is:** Final rule issued January 2024 by CMS. Formally titled "Interoperability and Prior Authorization" rule.

**Who it applies to:** MA plans, Medicaid managed care, CHIP, and QHP issuers on the exchanges. Commercial fully-insured plans follow state law, not this rule. Self-insured ERISA plans are exempt (important — majority of large employer coverage).

**Key provisions:**

- **PA decision timeframes (effective 2026):**
  - Urgent (expedited) requests: 72 hours (down from 3 business days)
  - Standard requests: 7 calendar days (down from 14)
  - These apply to non-urgent clinical determinations
- **Electronic PA (ePriorAuth) — effective 2027:** Payers must support FHIR-based PA API. The HL7 Da Vinci Prior Authorization Support (PAS) IG becomes the mandated exchange format. Providers submit structured clinical data; payers must respond via API.
- **Denial reason transparency:** Payers must return specific denial reasons — not just "criteria not met." They must cite the actual clinical criterion that failed.
- **PA metrics reporting (2026):** Payers must publicly report approval/denial rates, average decision times, and appeal outcomes by item/service category.

**Why this matters for PreClear MD:** The ePriorAuth API mandate creates a structured inbound data stream. AI can pre-validate requests against payer criteria *before* submission, reducing the round-trip. The denial reason transparency requirement also creates structured training data for ML models.

---

## MCG vs InterQual: The Criteria Gatekeepers

**What they are:** Both are clinical decision support vendors that publish evidence-based criteria sets. Payers license these to determine whether a requested service is "medically necessary."

| | MCG Health | InterQual (Change Healthcare / Optum) |
|---|---|---|
| Owner | Hearst Health | Optum (UHG) |
| Format | Clinical guidelines with decision trees | Criteria subsets by severity/intensity |
| Payer adoption | BCBS plans, regional Blues, Medicare Advantage | UHC (owns it), Cigna, many regionals |
| Access | Payer-licensed; providers rarely see the full text | Same — criteria are not public |

**What "criteria" actually means in a PA decision:**

When a payer says "criteria not met," they are saying the clinical documentation does not satisfy a specific checkpoint in their licensed criteria set. For vascular surgery, criteria typically evaluate:

- Conservative treatment trials completed (e.g., anticoagulation for 3+ months before IVC filter)
- Imaging findings that meet threshold (e.g., ABI < 0.5, occlusion percentage)
- Symptom severity and functional limitation documentation
- ICD-10 diagnosis codes aligned to the procedure code

The criteria themselves are proprietary and not disclosed to providers. Providers must reverse-engineer what the payer needs by reading prior approval letters and denial notices over time. This is the core pain point PreClear MD is solving.

---

## Vascular Surgery PA Burden

**Procedures that almost always require PA:**

- Peripheral vascular intervention (PVI) — angioplasty, stenting of peripheral arteries (CPT 37220–37235)
- Carotid endarterectomy (CEA) — CPT 35301
- Lower extremity bypass (CPT 35556, 35566, 35571)
- Endovascular aortic repair (EVAR/TEVAR) — CPT 34701–34716
- IVC filter placement and retrieval — CPT 37191, 37193
- AV fistula creation for dialysis — CPT 36821, 36819

**Denial rates:** Industry surveys (AMA, SVS) report surgical specialty PA denial rates of 12–18%. Vascular surgery skews higher (15–25%) due to the imaging-intensive documentation requirements. Initial denials are common even for appropriate cases; the clinical record must be assembled precisely.

**Peer-to-peer review trigger conditions:**

- Automatic for any denial — provider has the right to request it
- Payer may proactively suggest it for borderline cases
- Common triggers: incomplete imaging documentation, conservative treatment not adequately documented, diagnosis-procedure code mismatch, laterality not specified
- Surgeons typically initiate 40–60% of denials into P2P — the rest are either appealed in writing or abandoned

---

## Peer-to-Peer Review Flow

**Who initiates:** The ordering/performing physician (or their office) contacts the payer's clinical review line. Some payers require the initiating call within 5–10 business days of denial.

**Who takes the call (payer side):** A payer-employed physician reviewer, sometimes board-certified in the same specialty, sometimes not. Medical directors rotate. Specialty alignment is not guaranteed.

**What changes minds:**

- Imaging findings stated verbally that were buried or absent in the submitted record
- Updated objective measurements (e.g., "ABI dropped from 0.6 to 0.4 since last submission")
- Patient-specific risk factors that shift the risk-benefit calculation (e.g., contralateral limb amputation)
- Clarification that a conservative therapy was tried and failed (documented but not clearly labeled in the record)

**What documentation is needed before the call:**

- Original PA submission (what was sent)
- Denial letter with specific criteria cited
- Complete imaging reports (duplex ultrasound, CTA/MRA with measurements)
- Office notes showing symptom progression and prior treatment
- Operative plan and clinical rationale

**The key insight:** The P2P call is not an appeal — it is a clinical conversation. A surgeon who walks in with a precise, criteria-matched verbal argument wins more often than one reading from a generic letter. The documentation that supports P2P is the same documentation that should have been in the original submission.

---

## Why PA AI Value Is at the Clinical Note Stage

The instinct is to build PA AI at the appeal/P2P stage (after denial). This is wrong, for three reasons:

**1. Denials cost more than approvals.** Average cost of a PA denial round-trip (admin time, physician time, delayed care, potential patient attrition) is $70–90 per case (AMA 2023 survey). Preventing the denial costs near zero.

**2. The clinical note is the upstream artifact.** By the time a PA request is submitted, the note is written. If the note doesn't contain the right language, measurements, and prior-treatment documentation, no downstream process fixes it. AI at the note stage can flag the gap before submission.

**3. Structured extraction enables payer-specific formatting.** Different payers (even on the same MCG criteria) want documentation formatted differently. An AI that reads the clinical note and generates a PA-ready summary, pre-formatted for the target payer, removes the manual translation step that burns 2–4 hours per complex case.

**The developer's role:** Build the extraction and formatting layer. The surgeon-founder provides the clinical criteria mapping (what MCG/InterQual actually looks for). The AI reads the note, confirms the criteria checklist, flags missing elements, and produces the submission package. The value proposition is: submit right the first time.

<!-- dna-touches
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-3, date: 2026-06-12, action: created }
-->