---
title: "AWS Bedrock HIPAA Reference Architecture"
type: research
domain: personal
status: DRAFT
created: 2026-06-12
created_model: claude-sonnet-4-6
qoq_item_id: 622
---

# AWS Bedrock HIPAA Reference Architecture

Research compiled from AWS official documentation, AWS blog posts, and the AWS HIPAA Eligible Services Reference. All sources are AWS-owned unless noted.

---

## 1. HIPAA Eligibility

### Is Amazon Bedrock HIPAA-Eligible?

**Yes. Amazon Bedrock is explicitly listed on the AWS HIPAA Eligible Services Reference page** (last updated May 22, 2026). The full entry reads:

> "Amazon Bedrock" — listed without exclusions

Source: https://aws.amazon.com/compliance/hipaa-eligible-services-reference/

Amazon Bedrock AgentCore is also separately listed as HIPAA-eligible on the same page.

### What HIPAA-Eligible Actually Means

Per AWS documentation (aws.amazon.com/compliance/hipaa-compliance/):

> "Customers may use any AWS service in an account designated as a HIPAA account, but they should only process, store, and transmit protected health information (PHI) in the HIPAA-eligible services defined in the Business Associate Addendum (BAA)."

Key distinction: **HIPAA-eligible does not mean automatically HIPAA-compliant.** Customers must:

1. Execute the AWS Business Associate Addendum (BAA) — available self-service via AWS Artifact in the Management Console.
2. Configure and implement controls within the services to achieve actual compliance.
3. Only use HIPAA-eligible services to process/store/transmit ePHI; non-eligible services (e.g., tagging APIs) must not touch ePHI even within a HIPAA account.

### Which Claude Models on Bedrock Are HIPAA-Eligible?

All Claude models available through Amazon Bedrock fall under the Bedrock HIPAA eligibility umbrella — there is no per-model carve-out in the HIPAA eligible services reference. The applicable models as of June 2026:

- Claude Sonnet 4.6 (`anthropic.claude-sonnet-4-6`) — launched Feb 17, 2026
- Claude Opus 4.8 (`anthropic.claude-opus-4-8`) — launched May 28, 2026
- Claude Opus 4.7, Claude Opus 4.6, Claude Sonnet 4.5, Claude Haiku 4.5, and older 3.x models

**Note:** Anthropic's Acceptable Use Policy lists additional requirements for high-risk use cases in healthcare. Review https://www.anthropic.com/legal/aup before deploying in clinical settings.

Source: AWS blog "HIPAA compliance for generative AI solutions on AWS" (Oct 2025): https://aws.amazon.com/blogs/industries/hipaa-compliance-for-generative-ai-solutions-on-aws/

---

## 2. VPC Endpoint for Bedrock (PrivateLink)

### The Core Problem Solved

Without a VPC endpoint, Lambda/EC2 calls to Bedrock traverse the public internet. For HIPAA workloads, this is a compliance risk: PHI in the request body would leave AWS-controlled network paths.

AWS PrivateLink solves this by creating a private interface endpoint inside your VPC. Traffic to Bedrock stays on AWS backbone infrastructure and never touches a public IP or internet gateway.

Source: AWS Bedrock VPC endpoints documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/vpc-interface-endpoints.html

### Endpoint Service Names

Create interface endpoints using these service name patterns (replace `region` with actual region, e.g., `us-east-1`):

| Category | Service Name |
|---|---|
| Bedrock Control Plane API | `com.amazonaws.{region}.bedrock` |
| Bedrock Runtime API (InvokeModel, Converse) | `com.amazonaws.{region}.bedrock-runtime` |
| Bedrock Agents Build-time | `com.amazonaws.{region}.bedrock-agent` |
| Bedrock Agents Runtime | `com.amazonaws.{region}.bedrock-agent-runtime` |
| FIPS endpoint (runtime) | `com.amazonaws.{region}.bedrock-runtime-fips` |

**For a HIPAA SaaS platform, the critical endpoint is `bedrock-runtime`** — this is what handles `InvokeModel`, `Converse`, and `ConverseStream` calls that carry prompt/response content.

FIPS endpoints (`bedrock-fips`, `bedrock-runtime-fips`) are available in us-east-1, us-east-2, us-west-2, ca-central-1, us-gov-east-1, and us-gov-west-1.

### How to Configure

1. In the VPC console, go to Endpoints → Create endpoint.
2. Search for `bedrock-runtime`, select `com.amazonaws.us-east-1.bedrock-runtime`.
3. Select your VPC and private subnets (use at least 2 AZs for HA).
4. Assign a security group that only allows TLS (port 443) from your Lambda/EC2 security group.
5. Enable **Private DNS Name** — this allows code to use the standard `bedrock-runtime.us-east-1.amazonaws.com` DNS name without any code changes. Traffic automatically routes through the endpoint.

### boto3 Code with Explicit Endpoint URL (Private DNS disabled)

```python
import boto3

client = boto3.client(
    "bedrock-runtime",
    region_name="us-east-1",
    endpoint_url="https://vpce-{id}.bedrock-runtime.us-east-1.vpce.amazonaws.com"
)
```

If Private DNS is enabled, no `endpoint_url` is needed — standard Boto3 code works as-is.

### VPC Endpoint Policy (Least Privilege)

Attach a resource-based policy to the endpoint to restrict which principals and models can be invoked:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::{account-id}:role/{lambda-execution-role}"
      },
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-6",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-opus-4-8"
      ]
    }
  ]
}
```

Source: AWS ML blog "Use AWS PrivateLink to set up private access to Amazon Bedrock": https://aws.amazon.com/blogs/machine-learning/use-aws-privatelink-to-set-up-private-access-to-amazon-bedrock/

---

## 3. KMS Encryption

### Encryption in Transit

Per AWS Bedrock data encryption docs:

> "Within AWS, all inter-network data in transit supports TLS 1.2 encryption. Requests to the Amazon Bedrock API and console are made over a secure (SSL) connection."

Additionally: "Amazon Bedrock only allows encrypted connections to the service."

No configuration required — TLS is mandatory and cannot be disabled.

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/data-encryption.html

### Encryption at Rest — What KMS Covers in Bedrock

KMS customer-managed keys (CMKs) can be applied to the following Bedrock resources:

| Resource | How to Specify |
|---|---|
| Model customization jobs + output models | `customModelKmsKeyId` in `CreateModelCustomizationJob` API |
| Bedrock Agents | `customerEncryptionKeyArn` in `CreateAgent` API |
| Knowledge Base data source ingestion jobs | `kmsKeyArn` in `CreateDataSource` / `UpdateDataSource` API |
| Model evaluation jobs | `customerEncryptionKeyId` in `CreateEvaluationJob` API |
| OpenSearch Service vector stores | Via OpenSearch encryption settings |

**Important gap:** Standard `InvokeModel` / `Converse` calls (the actual prompt/response) are **not encrypted with customer-managed KMS keys** in the Bedrock runtime path. Bedrock uses AWS-managed encryption for the transient inference compute. PHI in prompts should be treated as in-flight data protected by TLS, not at-rest KMS.

For HIPAA: if you use Bedrock Knowledge Bases to store patient data for RAG, that storage **does** support CMK encryption. Session/user data stored in RDS should use RDS encryption with a CMK.

### Recommended KMS Configuration for Adjacent Services

```
S3 (training data, log output):   aws/s3 → customer CMK (arn:aws:kms:...)
RDS PostgreSQL (PHI records):     customer CMK with automatic rotation enabled
CloudWatch Logs (application):    customer CMK or aws/logs with restricted IAM
Secrets Manager (API keys):       customer CMK
```

Source: AWS HIPAA generative AI blog, AWS Bedrock data-encryption docs.

---

## 4. CloudTrail Logging — What Gets Logged and PHI Risk

### What CloudTrail Logs for Bedrock

CloudTrail logs **all** Bedrock API calls. There are two categories:

**Management events (logged by default):**
- `InvokeModel` — logs the call (who, when, which model, source IP)
- `InvokeModelWithResponseStream`
- `Converse` and `ConverseStream`
- All control-plane operations: `CreateAgent`, `StopModelCustomizationJob`, etc.

**Data events (require explicit configuration):**
- `InvokeAgent` calls (resource type: `AWS::Bedrock::AgentAlias`)
- `InvokeInlineAgent` (resource type: `AWS::Bedrock::InlineAgent`)
- `GetAsyncInvoke` / `StartAsyncInvoke` (resource type: `AWS::Bedrock::Model` + `AWS::Bedrock::AsyncInvoke`)
- `Retrieve` / `RetrieveAndGenerate` Knowledge Base calls (resource type: `AWS::Bedrock::KnowledgeBase`)

### Critical PHI Question: Are Request/Response Bodies Logged?

**Looking at the actual CloudTrail log entry from AWS docs:**

```json
{
  "eventName": "InvokeModel",
  "requestParameters": {
    "modelId": "stability.stable-diffusion-xl-v0"
  },
  "responseElements": null,
  ...
}
```

The CloudTrail log for `InvokeModel` only records:
- `modelId` in `requestParameters`
- `responseElements: null`

**The prompt text and model response body are NOT included in CloudTrail logs.** CloudTrail records the control-plane metadata (who called, which model, when) — not the inference payload.

This is the key HIPAA protection: PHI sent in prompts does not appear in CloudTrail.

### Remaining PHI Risks in Logging

PHI can still leak into logs from these sources — each must be controlled:

| Log Source | Risk | Mitigation |
|---|---|---|
| CloudWatch Logs (Lambda `console.log`) | Developer logging of prompt/response | Structured logging that never logs PHI fields; code review enforcement |
| API Gateway Access Logs | Request body logging if configured | Set log format to exclude body; only log method, path, status, latency |
| X-Ray traces | Trace segments can capture HTTP body if SDK annotations are used | Do not annotate PHI fields; use metadata sparingly |
| Application error monitoring (Sentry/Datadog) | Unhandled exceptions can serialize full request objects | Implement `beforeSend` hooks to scrub PHI from error payloads; use AWS-native observability instead |
| CloudWatch Logs Insights | If app logs structured JSON with PHI | Use CloudWatch Logs data protection to auto-detect and mask ePHI patterns |

**CloudWatch Logs Data Protection** (HIPAA-eligible service) can automatically detect and mask 100+ PII/PHI patterns including names, DOBs, SSNs, MRNs. Enable at the log group level.

Source: AWS HIPAA blog: "Avoid having monitoring data include any ePHI, and where unavoidable make sure that encryption and access controls are in place for the log data. Use Amazon Macie to scan log data on Amazon S3 for PII and ePHI."

---

## 5. IAM Least-Privilege Policy

### Minimum IAM Policy to Invoke a Specific Claude Model

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvokeSpecificModel",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-6",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-opus-4-8"
      ]
    }
  ]
}
```

To also allow the Converse API (recommended for multi-turn healthcare workflows):

```json
{
  "Action": [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream",
    "bedrock:Converse",
    "bedrock:ConverseStream"
  ]
}
```

### ARN Pattern for Foundation Model Resources

The ARN format for Bedrock foundation models is:

```
arn:aws:bedrock:{region}::foundation-model/{model-id}
```

Note the double-colon (`::`) — there is no account ID in foundation model ARNs. They are AWS-owned resources.

Examples:
```
arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-6
arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-opus-4-8
```

For cross-region inference (Geo or Global IDs), use `*` in the region position or restrict to known regions:
```
arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-6
```

### Lambda Execution Role Additional Permissions for VPC

Lambda functions in a VPC also need these permissions to create/manage ENIs:

```json
{
  "Action": [
    "ec2:CreateNetworkInterface",
    "ec2:DescribeNetworkInterfaces",
    "ec2:DeleteNetworkInterface"
  ],
  "Resource": "*"
}
```

Source: AWS PrivateLink Bedrock blog; AWS VPC endpoint docs.

---

## 6. PHI Isolation Patterns

### Architecture Principle: PHI Should Only Exist in Designated Tiers

In a HIPAA-compliant Bedrock SaaS, treat PHI isolation as a zoning problem. Assign each layer of the stack to one of three PHI zones:

```
PHI Zone A (storage):   RDS PostgreSQL (patient records, session data)
                        S3 with SSE-KMS (documents, audit exports)

PHI Zone B (compute):   Lambda (VPC-attached, no persistent state)
                        Bedrock (HIPAA-eligible, data not retained by AWS)

PHI Free Zone:          React frontend (never holds raw PHI, uses tokens/IDs)
                        API Gateway (logs stripped of body)
                        CloudFront (no PHI in query strings/headers)
                        Sentry/Datadog (connected via PHI-scrubbing middleware)
```

### Specific Controls Per Layer

**Lambda:**
- Run in private VPC subnets (no internet egress without NAT)
- Never log PHI via `console.log` — use structured logging with explicit field allowlists
- Use AWS Powertools for Lambda (Python) for structured logging with field redaction
- Store PHI-bearing data in RDS/S3, not Lambda environment variables or `/tmp`

**API Gateway:**
- Disable "Log full requests/responses data" in stage settings
- Access log format: `$context.requestId $context.httpMethod $context.resourcePath $context.status $context.responseLatency`
- No body logging

**X-Ray:**
- Do not use `xray.add_metadata()` or `xray.add_annotation()` with PHI values
- Subsegment names can use patient IDs only if patient IDs are de-identified tokens (not MRNs/SSNs)

**Sentry/Datadog:**
- Implement `beforeSend` callback to strip PHI from error context
- Use AWS CloudWatch Application Signals instead for primary observability in PHI-adjacent Lambda
- If using Datadog, ensure the Datadog agent is not deployed in the same subnet as PHI data stores without network controls

**React Frontend:**
- Store session tokens (JWT/Cognito tokens), not PHI, in localStorage or memory
- Never serialize full patient objects into localStorage
- Use patient UUIDs as URL path parameters, never names or MRNs

**Bedrock Inference:**
- AWS's BAA commits that customer data (prompts, responses) is not used to train models and is not retained beyond the inference call
- Bedrock Guardrails (PII filter) can strip 30+ PHI entity types from prompts and responses — enable for additional defense-in-depth

Source: AWS HIPAA generative AI blog; AWS Bedrock Guardrails documentation.

---

## 7. Reference Architecture: HIPAA-Compliant React → API Gateway → Lambda → Bedrock

### Architecture Diagram (ASCII)

```
User Browser
    |
    | HTTPS (TLS 1.3)
    v
Amazon CloudFront
    |
    | (static assets → S3)
    | (API requests → API Gateway)
    v
Amazon API Gateway (REST or HTTP)
  - Request validation (JSON schema)
  - Cognito authorizer (JWT verification)
  - Access logs: method/path/status only (no body)
    |
    | Lambda proxy integration
    v
AWS Lambda (Python/Node)
  - Runs in PRIVATE VPC subnet
  - Execution role: bedrock:InvokeModel on specific model ARNs only
  - Reads patient context from RDS (via RDS Proxy in same VPC)
  - Constructs prompt WITHOUT raw PHI in system context
    |
    +---> Amazon RDS PostgreSQL (private subnet)
    |     - Multi-AZ, encrypted with customer KMS CMK
    |     - Patient records, session state, conversation history
    |
    | Via VPC endpoint (com.amazonaws.us-east-1.bedrock-runtime)
    | NO internet transit — stays on AWS backbone
    v
Amazon Bedrock (Claude Sonnet 4.6 or Opus 4.8)
  - HIPAA-eligible
  - Data not retained beyond inference
  - All calls logged in CloudTrail (metadata only, not body)
    |
    v
Response returned to Lambda → API Gateway → CloudFront → User
```

### VPC Architecture

```
VPC (10.0.0.0/16)
|
+-- Public Subnets (10.0.1.0/24, 10.0.2.0/24)
|   - NAT Gateway (for Lambda internet egress if needed)
|   - Application Load Balancer (optional)
|
+-- Private Subnets App Tier (10.0.10.0/24, 10.0.11.0/24)
|   - Lambda functions (VPC-attached)
|   - RDS Proxy
|
+-- Private Subnets Data Tier (10.0.20.0/24, 10.0.21.0/24)
|   - RDS PostgreSQL Multi-AZ
|
+-- VPC Endpoints (no internet)
    - com.amazonaws.us-east-1.bedrock-runtime
    - com.amazonaws.us-east-1.bedrock
    - com.amazonaws.us-east-1.secretsmanager
    - com.amazonaws.us-east-1.kms
    - com.amazonaws.us-east-1.logs
    - com.amazonaws.us-east-1.s3 (Gateway type)
```

### Why VPC Endpoints for KMS, Secrets Manager, and Logs?

Lambda in a private subnet with a VPC endpoint for Bedrock must also reach KMS (for decryption), Secrets Manager (for DB credentials), and CloudWatch Logs (for logging) — all without internet egress. Add interface endpoints for each. This ensures no ePHI ever touches the public internet across the entire request path.

### Key HIPAA-Specific Additions vs. Standard Architecture

| Standard | HIPAA Addition |
|---|---|
| Lambda in default VPC | Lambda in private VPC subnet |
| Public Bedrock HTTPS endpoint | Bedrock VPC interface endpoint |
| AWS-managed KMS for RDS | Customer-managed CMK with rotation |
| CloudWatch Logs with full request bodies | Structured logging, no PHI in log statements |
| API Gateway full logging | Access logs with method/path/status only |
| No BAA | AWS BAA executed via Artifact |
| Cognito auth | Cognito + short-lived tokens, PHI-free JWT claims |
| Standard error handling | Error scrubbing middleware (PHI stripped before Sentry/Datadog) |

---

## 8. Model IDs

All model IDs sourced from official AWS Bedrock model card pages (docs.aws.amazon.com/bedrock/latest/userguide/).

### Claude Sonnet 4.6

| Field | Value |
|---|---|
| Model ID (bedrock-runtime) | `anthropic.claude-sonnet-4-6` |
| US Geo inference ID | `us.anthropic.claude-sonnet-4-6` |
| Global inference ID | `global.anthropic.claude-sonnet-4-6` |
| In-Region for us-east-1 | Not available (Geo/Global only from us-east-1) |
| Launch date | Feb 17, 2026 |
| Context window | 1M tokens |
| Max output tokens | 64K |
| Supported features | InvokeModel, Converse, streaming, Guardrails, Agents, Knowledge Base, structured outputs |

**Note for HIPAA:** Claude Sonnet 4.6 does NOT support in-region inference from us-east-1 — requests use Geo cross-region routing (can hit us-east-1, us-east-2, or us-west-2). If strict us-east-1 data residency is required (some HIPAA architectures mandate this), this is a gap. Use Opus 4.8 or check the model card for an In-Region-capable Claude model.

Sample invocation:
```python
modelId='anthropic.claude-sonnet-4-6'
# or for US geo routing:
modelId='us.anthropic.claude-sonnet-4-6'
```

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-6.html

### Claude Opus 4.8

| Field | Value |
|---|---|
| Model ID (bedrock-runtime) | `anthropic.claude-opus-4-8` |
| Model ID (bedrock-mantle endpoint) | `anthropic.claude-opus-4-8` |
| US Geo inference ID | `us.anthropic.claude-opus-4-8` |
| Global inference ID | `global.anthropic.claude-opus-4-8` |
| In-Region for us-east-1 | **Yes** — us-east-1 supports In-Region for Opus 4.8 |
| Launch date | May 28, 2026 |
| Context window | 1M tokens |
| Max output tokens | 128K |
| Supported features | InvokeModel, Converse, Messages API (bedrock-mantle), streaming, Guardrails, Agents, Knowledge Base |

**Advantage for strict HIPAA:** Opus 4.8 supports In-Region inference from us-east-1, meaning requests can be pinned to us-east-1 only — important when PHI data residency must stay in a single region.

Sample invocation (boto3, bedrock-runtime):
```python
modelId='anthropic.claude-opus-4-8'
```

Sample invocation (Anthropic SDK via bedrock-mantle):
```python
from anthropic import AnthropicBedrockMantle
client = AnthropicBedrockMantle(aws_region="us-east-1")
message = client.messages.create(
    model="anthropic.claude-opus-4-8",
    max_tokens=1024,
    messages=[{"role": "user", "content": "..."}]
)
```

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-8.html

---

## Key Findings for Proposal

**1. Bedrock is explicitly HIPAA-eligible and BAA-covered.**
Amazon Bedrock (and AgentCore) appear on AWS's HIPAA Eligible Services Reference as of May 2026. The AWS BAA is self-service via AWS Artifact. This is the authoritative answer for the client: the chosen stack is a legitimate HIPAA-capable foundation.

**2. PHI does not appear in CloudTrail logs for standard inference calls.**
CloudTrail logs `InvokeModel` and `Converse` as management events, but records only the `modelId` in requestParameters — the prompt body and response are not logged. This directly addresses the PHI-in-logs concern: the inference payload is protected by TLS in transit and does not persist in audit logs.

**3. VPC endpoint (PrivateLink) eliminates internet transit for PHI.**
Service name `com.amazonaws.us-east-1.bedrock-runtime` creates a private interface endpoint so Lambda-to-Bedrock traffic never leaves the AWS backbone. This is the standard HIPAA control for network isolation. Enable Private DNS on the endpoint and no code changes are needed.

**4. Lambda in a private VPC subnet + VPC endpoints for all AWS services is the complete network isolation pattern.**
A Lambda accessing Bedrock, RDS, KMS, Secrets Manager, and CloudWatch Logs all via VPC endpoints (no NAT Gateway needed for these) creates a fully air-gapped PHI processing environment.

**5. Opus 4.8 supports strict single-region (us-east-1 In-Region) inference; Sonnet 4.6 does not.**
For HIPAA architectures where the BAA or client contract specifies us-east-1 data residency, use `anthropic.claude-opus-4-8` with In-Region routing. Sonnet 4.6 from us-east-1 always uses Geo cross-region (spreads across us-east-1/us-east-2/us-west-2). Document this tradeoff explicitly in the proposal.

**6. PHI isolation in non-Bedrock layers (CloudWatch, X-Ray, Sentry) is where most teams fail.**
The proposal should demonstrate awareness that while Bedrock's own logging is clean, application-layer logging (Lambda console.log, API Gateway full body logging, error monitoring SDKs) is where PHI leaks occur. Naming these risks and the specific mitigations (structured logging allowlists, API Gateway access log format control, `beforeSend` scrubbing hooks) is what differentiates a credible HIPAA architecture proposal from a generic one.

---

## Sources

| Source | URL | Type |
|---|---|---|
| AWS HIPAA Eligible Services Reference (May 2026) | https://aws.amazon.com/compliance/hipaa-eligible-services-reference/ | Official |
| HIPAA compliance for generative AI solutions on AWS (Oct 2025) | https://aws.amazon.com/blogs/industries/hipaa-compliance-for-generative-ai-solutions-on-aws/ | AWS Blog |
| Bedrock VPC interface endpoints (AWS docs) | https://docs.aws.amazon.com/bedrock/latest/userguide/vpc-interface-endpoints.html | Official |
| Use AWS PrivateLink to set up private access to Amazon Bedrock | https://aws.amazon.com/blogs/machine-learning/use-aws-privatelink-to-set-up-private-access-to-amazon-bedrock/ | AWS Blog |
| Amazon Bedrock data encryption (AWS docs) | https://docs.aws.amazon.com/bedrock/latest/userguide/data-encryption.html | Official |
| Monitor Amazon Bedrock API calls using CloudTrail (AWS docs) | https://docs.aws.amazon.com/bedrock/latest/userguide/logging-using-cloudtrail.html | Official |
| Claude Sonnet 4.6 model card | https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-6.html | Official |
| Claude Opus 4.8 model card | https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-8.html | Official |
| AWS HIPAA compliance overview | https://aws.amazon.com/compliance/hipaa-compliance/ | Official |
