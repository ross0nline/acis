---
title: "Bedrock PoC — Full Troubleshooting Runbook"
type: research
domain: personal
status: COMPLETE
created: 2026-06-12
created_model: claude-sonnet-4-6
created_session: post-78e6e2b4-compaction-4
qoq_item_id: 654
sweep_count: 0
touches:
  - model: claude-sonnet-4-6
    session: post-78e6e2b4-compaction-4
    date: 2026-06-12
    action: created
---

# Bedrock PoC — Full Troubleshooting Runbook

13 errors encountered and fixed during development of the prior authorization rubric scorer on AWS Lambda + CDK + Bedrock.

**Live endpoint:** `POST https://h3fv5e1t4k.execute-api.us-east-1.amazonaws.com/score`  
**Stack:** BedrockPocStack, account 548827541600, region us-east-1  
**Active model:** `amazon.nova-pro-v1:0` (interim — target is `anthropic.claude-opus-4-8` pending enrollment)

---

## Error 1: Bedrock Claude enrollment blocked on new account

**Symptom:** `InvokeModel` for `anthropic.claude-*` returns `AccessDeniedException: You don't have access to the model with the specified model ID.`

**Cause:** New AWS accounts cannot use Anthropic models on Bedrock. This is an account-level business enrollment — not an IAM issue. IAM policy may be fully correct.

**Fix:** Request Bedrock model access at `us-east-1.console.aws.amazon.com/bedrock/home` → Model Access → Request access for Claude models. AWS Sales has been looped in; approval takes 1–5 business days for new accounts.

**Interim path:** Switch to `amazon.nova-pro-v1:0`. The scoring logic and JSON output schema are identical; only the request format and response parse path differ.

---

## Error 2: Cross-region inference profiles bypass enrollment? No

**Symptom:** Tried `us.anthropic.claude-opus-4-8` (cross-region inference profile) — still `AccessDeniedException`.

**Cause:** Cross-region inference profiles route to the same base model. They select the AWS region with available capacity, but the underlying model is still Anthropic Claude. The account-level enrollment block applies regardless of whether you use the base model ID or the inference profile ARN.

**Fix:** Same as Error 1 — true enrollment required. Don't try inference profile ARNs as a workaround.

---

## Error 3: Nova Pro request body — system must be an array

**Symptom:** `ValidationException: The request body is invalid.` when `system` field is a string.

**Cause:** Nova Pro uses Converse API format. The `system` field must be an array of content objects, not a plain string.

```typescript
// Wrong
system: "You are a prior auth specialist..."

// Right
system: [{ text: "You are a prior auth specialist..." }]
```

**Fix:** Wrap system prompt in `[{ text: ... }]`.

---

## Error 4: Nova Pro messages content must be an array

**Symptom:** `ValidationException` when `messages[0].content` is a string.

**Cause:** Same Converse API format requirement. Message content must be a typed content array.

```typescript
// Wrong
messages: [{ role: "user", content: "Clinical note: ..." }]

// Right
messages: [{ role: "user", content: [{ text: "Clinical note:\n\n" + note }] }]
```

**Fix:** Wrap message content in `[{ text: ... }]`.

---

## Error 5: Nova Pro response parse path

**Symptom:** `parsed.content[0].text` is `undefined`. Model call succeeds but response extraction fails.

**Cause:** Nova Pro wraps the response in `output.message.content[]`. Claude Bedrock format returns `content[]` directly at the top level.

```typescript
// Claude Bedrock
const raw = parsed.content[0].text;

// Nova Pro
const raw = parsed.output.message.content[0].text;
```

**Fix:** Update response parse path. The handler now uses the Nova Pro path.

---

## Error 6: Nova Pro inference config key is `max_new_tokens`, not `max_tokens`

**Symptom:** Request succeeds but response is truncated or throws `ValidationException` when using `max_tokens`.

**Cause:** Nova Pro uses `inferenceConfig: { max_new_tokens: N }`. Claude Bedrock uses `max_tokens` at the top level.

```typescript
// Claude Bedrock
{ max_tokens: 1024, system: ..., messages: [...] }

// Nova Pro
{ system: [...], messages: [...], inferenceConfig: { max_new_tokens: 1024 } }
```

**Fix:** Use `inferenceConfig.max_new_tokens` for Nova Pro. Remove `max_tokens` from the body.

---

## Error 7: CDK bootstrap required before first deploy

**Symptom:** `cdk deploy` fails with `BedrockPocStack: failed to deploy... needs bootstrapping`.

**Cause:** First-time CDK deploy to an account/region pair requires bootstrapping the CDK toolkit stack (creates S3 bucket, IAM roles for CloudFormation execution).

**Fix:**
```bash
npx cdk bootstrap aws://548827541600/us-east-1
```
Run once per account/region combination. Safe to re-run — idempotent.

---

## Error 8: Lambda timeout too short for Bedrock cold start

**Symptom:** Lambda returns `Task timed out after 3.00 seconds` on first invocation after deployment.

**Cause:** Default Lambda timeout is 3 seconds. Bedrock model invocation on a cold-start container takes 4–8 seconds for Nova Pro, longer for Claude.

**Fix:** Set timeout to 30 seconds in CDK stack:
```typescript
const fn = new lambda.Function(this, "ScorerFn", {
  timeout: cdk.Duration.seconds(30),
  ...
});
```

---

## Error 9: API Gateway payload — event.body is a string, not a parsed object

**Symptom:** `body.note` is `undefined` even when the request JSON has a `note` field.

**Cause:** API Gateway HTTP API (v2) passes the body as a raw JSON string in `event.body`. It is NOT pre-parsed by Lambda.

**Fix:** `JSON.parse(event.body ?? "{}")` — already implemented in handler. Don't assume `event.body` is an object.

---

## Error 10: Lambda role missing `bedrock:InvokeModel` permission

**Symptom:** `AccessDeniedException` from the SDK inside the Lambda, even with correct IAM user access.

**Cause:** The Lambda execution role needs explicit Bedrock permissions. The IAM user credentials used locally are separate from the Lambda role.

**Fix:** Add inline policy to the Lambda role in CDK:
```typescript
fn.addToRolePolicy(new iam.PolicyStatement({
  actions: ["bedrock:InvokeModel"],
  resources: ["arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0"],
}));
```

---

## Error 11: Model ID format — `:0` version suffix is required

**Symptom:** `ResourceNotFoundException: Could not find model amazon.nova-pro-v1`.

**Cause:** Nova Pro model IDs include a version suffix. `amazon.nova-pro-v1` without the `:0` is not a valid model identifier.

**Fix:** Use the full model ID: `amazon.nova-pro-v1:0`.

For Claude Bedrock (when enrollment is granted): `anthropic.claude-opus-4-8` (no version suffix required for Anthropic models via Bedrock).

---

## Error 12: Warm Lambda container serves old code after redeploy

**Symptom:** Bug appears fixed after `cdk deploy`, but Lambda still returns old behavior on immediate invocation.

**Cause:** Lambda keeps warm containers running for ~30 seconds after a code update. The first invocation after `UPDATE_COMPLETE` may hit an old container.

**Fix:** Wait 30 seconds after deploy completes, or invoke the function twice. CloudWatch Logs will show the new `START RequestId` timestamp confirming the new code is running.

---

## Error 13: Model returns valid JSON with wrong schema — silent failure

**Symptom:** 200 response but the scoring result doesn't render correctly. No error logged.

**Cause:** Nova Pro occasionally returns the JSON wrapped in markdown code fences (```json ... ```) instead of raw JSON, causing `JSON.parse()` to throw. Or the model returns an object with different key names than the schema.

**Fix (implemented):**
1. Schema validation after parse: check `Array.isArray(result.criteria)` and `typeof result.readiness_score === "number"`. Return 422 if validation fails.
2. Log `raw_length` on malformed response to make debugging easier.
3. Prompt includes `Return ONLY valid JSON — no markdown, no explanation outside the JSON` — reduces occurrence rate.

---

## Live Test Results (2026-06-12)

### Weak note — lumbar MRI

```json
{
  "note": "Patient presents with back pain. Requesting MRI lumbar spine. Has had pain for a few months.",
  "payer": "UnitedHealthcare",
  "procedure": "MRI Lumbar Spine"
}
```

Expected: 2+ Fail, low score. Run via `bash test-cases.sh`.

### Strong note — carotid endarterectomy (live test, 2026-06-12)

```json
{
  "payer": "UnitedHealthcare",
  "procedure": "Carotid Endarterectomy",
  "note": "68yo male, symptomatic carotid stenosis >70% on CTA, two TIAs in 30 days. ICD-10: I65.21. Conservative management: aspirin + clopidogrel + statin x 6 weeks, persistent symptoms. Surgical candidacy reviewed."
}
```

**Result:**
```json
{
  "criteria": [
    { "name": "medical_necessity_statement", "status": "Pass", "reason": "Note clearly states the medical necessity for the procedure." },
    { "name": "diagnosis_code_specificity", "status": "Pass", "reason": "Note includes a specific ICD-10 code with sufficient clinical detail." },
    { "name": "conservative_treatment_documented", "status": "Pass", "reason": "Note documents prior conservative treatments and their outcomes." }
  ],
  "readiness_score": 90,
  "fix_language": "Consider adding more detail on the severity and frequency of TIA episodes and the exact duration of conservative management."
}
```

Score: **90/100, all criteria Pass.** Fix suggestion is specific and clinically actionable.

---

## Migration to Claude (when enrollment granted)

All changes in `lambda/handler.ts`:

1. `MODEL_ID = "anthropic.claude-opus-4-8"`
2. `buildPrompt()` returns Claude Bedrock format:
```json
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 1024,
  "system": "<string>",
  "messages": [{ "role": "user", "content": "<string>" }]
}
```
3. Response parse: `parsed.content[0].text`

Then `npx cdk deploy`. Wait 30s for warm containers to cycle.
