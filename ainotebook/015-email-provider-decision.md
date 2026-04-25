# ADR 015 — Email Provider: Resend Now, Cloudflare Email Service Later

**Status:** Decided  
**Date:** 2026-04-25  
**Context:** Attestation email reminders, incident escalation notifications

---

## Context

Two email features are planned:
1. **Attestation reminders** — cron-triggered emails to client plans with overdue RxDC or Gag Clause status
2. **Incident escalation** — alert when heartbeat detects incidents open 7+ days

Both need to send transactional email from a Cloudflare Worker. Two viable options exist.

---

## Resend API (Current State)

- **Status:** API key already configured — `RESEND_API_KEY` is in `.dev.vars` (not yet wired to any code)
- **Integration:** HTTP API call from Worker, `Authorization: Bearer <key>` header
- **Developer experience:** Excellent; React Email templating; Cloudflare publishes an official tutorial
- **Deliverability:** Proven at scale; strong DKIM/SPF handling out of the box
- **Pricing:** Free tier 3,000/month; paid from $20/month
- **Risk:** Low — mature product, widely deployed

---

## Cloudflare Email Service (Future Path)

- **Status:** Public beta as of late 2025; native Workers binding (`env.SEND_EMAIL`)
- **Architecture advantage:** No API keys — binding declared in `wrangler.toml`, zero credential management, same model as D1/R2/KV
- **Auto-configures:** SPF, DKIM, DMARC per domain
- **Pricing:** $0.35 / 1,000 messages; requires Workers Paid plan (already on it)
- **Risk:** Beta — edge cases, deliverability reputation still maturing
- **Migration:** When GA, replacing Resend is a one-day change: swap HTTP call for `env.SEND_EMAIL.send()`, remove API key secret

---

## Decision

**Use Resend for the initial attestation reminder and escalation notification implementation.**

Rationale:
- The API key is already provisioned — zero setup cost
- Resend is production-ready; Cloudflare Email Service is beta
- Volume is low (8 client plans, reminder emails a few times per year) — deliverability track record matters more than cost at this scale
- Migration to Cloudflare Email Service is trivial when it reaches GA

**Migrate to Cloudflare Email Service when:**
- The service exits beta
- GA pricing is confirmed
- Deliverability reputation is established

---

## Implementation Notes

**Resend integration:**
```typescript
// wrangler.toml: RESEND_API_KEY secret (already set in .dev.vars)
const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'ACIS Compliance <noreply@rossonlineservices.com>',
    to: [client.contact_email],
    subject: `[ACIS] Attestation Reminder: ${client.plan_name}`,
    html: template,
  }),
});
```

**Future Cloudflare Email Service:**
```toml
# wrangler.toml
[[send_email]]
name = "SEND_EMAIL"
destination_address = "noreply@rossonlineservices.com"
```
```typescript
await env.SEND_EMAIL.send({ to: [...], subject: ..., html: ... });
```

---

## Resend Key Status

| Location | Status |
|---|---|
| `.dev.vars` | Present (`re_CfWU6NXj_...`) |
| Wrangler secret (deployed) | **NOT set** — must run `wrangler secret put RESEND_API_KEY` before deploying email features |
| Codebase (`src/`) | **Not referenced** — first use will be in attestation reminder module |

**Required before deploying any email feature:** add `RESEND_API_KEY` to Wrangler secrets.

---

## Sources

- [Cloudflare Email Service docs](https://developers.cloudflare.com/email-service/)
- [Cloudflare Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/)
- [Send Emails With Resend · Cloudflare Workers docs](https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/)
- [Cloudflare Email Service launch announcement](https://blog.cloudflare.com/email-service/)
