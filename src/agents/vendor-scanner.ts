import Anthropic from '@anthropic-ai/sdk';
import type { Env, VendorRisk } from '../types';
import { getStaleVendors, updateVendorScan } from '../db/queries';

export interface VendorScanResult {
  tls_valid: number;
  headers_score: number;
  ai_risk_summary: string;
  overall_status: VendorRisk['overall_status'];
}

function computeOverallStatus(
  tls_valid: number,
  headers_score: number,
): VendorRisk['overall_status'] {
  if (tls_valid === 0 && headers_score === 0) return 'Pending Review';
  if (tls_valid === 0) return 'High Risk';
  if (headers_score >= 70) return 'Approved';
  if (headers_score >= 40) return 'Requires Review';
  return 'High Risk';
}

const SCORED_HEADERS: Array<{ name: string; points: number }> = [
  { name: 'strict-transport-security', points: 20 },
  { name: 'content-security-policy', points: 20 },
  { name: 'x-frame-options', points: 15 },
  { name: 'x-content-type-options', points: 15 },
  { name: 'referrer-policy', points: 15 },
  { name: 'permissions-policy', points: 15 },
];

export async function scanVendor(
  client: Anthropic,
  vendorName: string,
  vendorUrl: string,
): Promise<VendorScanResult | null> {
  let tls_valid = 0;
  let headers_score = 0;
  const headers_found: string[] = [];
  const headers_missing: string[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(vendorUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    tls_valid = new URL(vendorUrl).protocol === 'https:' ? 1 : 0;

    for (const { name, points } of SCORED_HEADERS) {
      if (response.headers.get(name)) {
        headers_found.push(name);
        headers_score += points;
      } else {
        headers_missing.push(name);
      }
    }
  } catch {
    // fetch failed (timeout, DNS failure, TLS error) — tls_valid stays 0
  }

  try {
    const overall_status = computeOverallStatus(tls_valid, headers_score);

    const msg = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 512,
      output_config: { effort: 'xhigh' },
      system: `You are a HIPAA Business Associate security analyst. Evaluate vendor security posture based on TLS configuration and HTTP security headers. Respond with valid JSON only — no markdown, no text outside the JSON.`,
      messages: [{
        role: 'user',
        content: `Assess the security posture of vendor "${vendorName}" (${vendorUrl}):

TLS Valid: ${tls_valid ? 'Yes' : 'No'}
Security Headers Score: ${headers_score}/100
Headers Present: ${headers_found.length ? headers_found.join(', ') : 'None'}
Headers Missing: ${headers_missing.length ? headers_missing.join(', ') : 'None'}
Status: ${overall_status}

Return exactly this JSON:
{
  "ai_risk_summary": "2-3 sentences assessing this vendor's security posture and HIPAA Business Associate risk, explaining the specific gaps and why they matter for a covered entity"
}`,
      }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned) as Pick<VendorScanResult, 'ai_risk_summary'>;

    return {
      tls_valid,
      headers_score,
      ai_risk_summary: parsed.ai_risk_summary,
      overall_status,
    };
  } catch (err) {
    console.error('[vendor-scanner] Claude assessment failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function runVendorScan(env: Env): Promise<{ scanned: number; skipped: number }> {
  const stale = await getStaleVendors(env.ACIS_DB);
  if (stale.length === 0) return { scanned: 0, skipped: 0 };

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.AI_GATEWAY_URL });
  let scanned = 0;

  await Promise.allSettled(
    stale.map(async (vendor) => {
      const result = await scanVendor(client, vendor.vendor_name, vendor.vendor_url);
      if (result) {
        await updateVendorScan(env.ACIS_DB, vendor.id, result.tls_valid, result.headers_score, result.ai_risk_summary, result.overall_status);
        scanned++;
      }
    })
  );

  return { scanned, skipped: stale.length - scanned };
}
