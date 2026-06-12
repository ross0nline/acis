---
title: "Multi-Tenant RBAC Research — PreClear MD Video Call Prep"
type: research
domain: personal
status: DRAFT
created: 2026-06-12
created_model: claude-sonnet-4-6
created_session: post-78e6e2b4-compaction-3
qoq_item_id: 633
sweep_count: 1
touches:
  - { model: claude-sonnet-4-6, session: post-78e6e2b4-compaction-3, date: 2026-06-12, action: created }
---

# Multi-Tenant RBAC Research — PreClear MD Video Call Prep

## Shared-Schema Postgres with Row Level Security (RLS)

**The pattern:** All tenants (practices) live in one database, one schema. Every table that holds tenant data has a `tenant_id` column. RLS policies on each table enforce that a query only returns rows where `tenant_id` matches the session's active tenant, set via `SET LOCAL app.tenant_id = 'abc'` at the start of each request.

**How it works in practice:**

```sql
-- Policy on the prior_auth_requests table
CREATE POLICY tenant_isolation ON prior_auth_requests
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Set at the start of every DB connection/transaction
SET LOCAL app.tenant_id = '3f7a...';
```

Postgres enforces the filter at the storage layer — the application never writes `WHERE tenant_id = ?` manually. The policy applies automatically to SELECT, UPDATE, DELETE.

**What breaks if you get it wrong:**

- Forgetting `ENABLE ROW LEVEL SECURITY` on the table — policies exist but don't fire
- Using a superuser connection — RLS is bypassed by default for superusers (use `FORCE ROW LEVEL SECURITY` or a non-superuser application role)
- Connection pooling without resetting `app.tenant_id` — a pooled connection carries the previous tenant's setting to the next request (critical bug)
- PgBouncer in transaction mode resets session-level variables; must use `SET LOCAL` scoped to the transaction, not `SET`

**The migration path:** Start with RLS from day one. Retrofitting it onto an existing schema without it is painful — you must audit every query path and add the `SET LOCAL` call at every connection entry point.

---

## 4-Role Permission Matrix for Healthcare SaaS

| Action | Admin (Practice) | Provider (Physician) | Payer (Reviewer) | Auditor (Compliance) |
|---|---|---|---|---|
| Submit PA request | Create for any provider in practice | Create own requests | No | No |
| View PA requests | All requests in tenant | Own requests only | Assigned cases only | All (read-only) |
| View clinical notes | All in tenant | Own patients | Never | Yes (read-only) |
| Approve/deny | No | No | Assigned cases | No |
| View denial reasons | All in tenant | Own cases | Can add notes | All (read-only) |
| Manage users | Yes | No | No | No |
| View billing/usage | Yes | No | No | Yes |
| Export audit log | No | No | No | Yes |
| Configure payer criteria mappings | Yes | No | No | No |

**Key design decisions:**

- Payer role is external (cross-tenant read) — their scope is request-specific, not tenant-wide. Requires a separate access grant table linking a payer_reviewer_id to specific request IDs.
- Auditor is always read-only. Never mutates data. Access controlled by the Admin. Audit trail itself is immutable (append-only log table).
- Provider cannot see other providers' patients — even within the same practice unless Admin grants it (for on-call scenarios).

---

## Auth0 vs Clerk: BAA Status for HIPAA-Covered Apps

**Auth0 (Okta):**
- BAA available: **Yes** — requires Enterprise plan (~$24K/year minimum)
- HIPAA support documentation exists; they have gone through this with healthcare customers
- Supports machine-to-machine (M2M) tokens for API-to-API flows
- Organization feature maps directly to multi-tenant (one Org = one practice)
- Mature SAML/SSO support for enterprise practices that require it

**Clerk:**
- BAA available: **Yes** — available on Pro plan and above (~$25/month base, scales by MAU)
- Significantly cheaper for early-stage; BAA is not buried behind an enterprise gate
- Organizations feature is native and well-documented for multi-tenant SaaS
- React components are polished — faster to ship a clean auth UI
- Less mature enterprise SSO (SAML is newer; limited IdP coverage vs Auth0)

**Recommendation for PreClear MD:** Clerk for early stage — BAA is accessible at startup pricing, organizations map cleanly to practices, and the React SDK reduces frontend auth work. Migrate to Auth0 Enterprise if/when the client lands a large health system customer that requires SAML SSO to their own IdP.

**The BAA is non-negotiable:** If the app stores or processes PHI (clinical notes, patient names, diagnoses), the auth provider handles authentication tokens that may be associated with PHI access. This makes them a Business Associate. Operating without a BAA is a HIPAA violation regardless of whether the provider itself touches PHI.

---

## Session Handling for Multi-Tenant: JWT Claims Pattern

**The pattern:** Bind tenant identity to the session at authentication time, not at query time.

```json
// JWT payload (issued by Auth0/Clerk after login)
{
  "sub": "user_abc123",
  "email": "dr.smith@coastalvascular.com",
  "org_id": "org_coastalvascular",
  "tenant_id": "3f7a-...",
  "role": "provider",
  "exp": 1718200000
}
```

**On every API request:**

1. Validate JWT signature (never trust client-asserted tenant_id)
2. Extract `tenant_id` and `role` from verified claims
3. Set `app.tenant_id` in the DB session before any query
4. RBAC middleware checks `role` against the requested action before executing

**What prevents tenant leakage:**

- `tenant_id` comes from the verified JWT — the client cannot forge it
- RLS enforces it at the DB layer even if application middleware has a bug
- Defense in depth: two independent checks (app-layer RBAC + DB-layer RLS)

**Payer external access:** Payer reviewers are not members of the practice tenant. They get a scoped JWT with `role: payer` and a `request_ids: [...]` claim. The app-layer check validates the specific request ID is in their allowed list; the DB query filters by that list. No `tenant_id` in their token — they never get tenant-wide access.

---

## The Honest Gap: Cloudflare Workers + D1

**Where the current stack maps well:**

- Workers handle stateless API routing cleanly — RBAC middleware is straightforward
- JWT validation in Workers is fast and well-supported (`jose` library works in the Workers runtime)
- D1 can hold the tenant isolation column pattern (`tenant_id` on every table)
- Clerk's JWT integrates with Workers with minimal boilerplate

**Where it doesn't map:**

| Postgres/RLS Feature | D1 Reality | Mitigation |
|---|---|---|
| Row Level Security policies | Not supported — D1 is SQLite | Application-layer WHERE clauses on every query; enforce via query builder wrapper |
| `SET LOCAL app.tenant_id` | No session variables in D1 | Pass `tenant_id` explicitly to every query function; never derive from context |
| Connection pooling with session reset | Not applicable (D1 is serverless) | Actually an advantage — no persistent connections means no cross-request session bleed |
| Superuser bypass risk | Not applicable | D1 has one access mode; no privilege levels |
| FORCE ROW LEVEL SECURITY | Not needed | But also not available as a safety net |

**The mitigation for no RLS:** Build a query wrapper module that:
1. Accepts `tenantId` as a required parameter (TypeScript enforced — no default, no optional)
2. Always appends `AND tenant_id = ?` to every SELECT/UPDATE/DELETE
3. Throws at construction time if `tenantId` is missing or empty

This is less robust than Postgres RLS (a developer can bypass the wrapper) but works at scale if the wrapper is the only permitted path to D1. Code review and TypeScript strict mode enforce the pattern.

**If the surgeon-founder asks about scaling beyond D1:** The honest answer is that D1 is appropriate for early stage (hundreds of practices, millions of rows). If the product reaches 10K+ practices with high query volume, the architecture will need Hyperdrive + Neon/Supabase (Postgres with real RLS) behind it. The Workers API layer stays unchanged; only the database binding changes.
