import Anthropic from '@anthropic-ai/sdk';
import type { VendorRisk } from '../types';

export interface VendorScanResult {
  tls_valid: number;
  headers_score: number;
  ai_risk_summary: string;
  overall_status: VendorRisk['overall_status'];
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
    const msg = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 512,
      system: `You are a HIPAA Business Associate security analyst. Evaluate vendor security posture based on TLS configuration and HTTP security headers. Respond with valid JSON only — no markdown, no text outside the JSON.`,
      messages: [{
        role: 'user',
        content: `Assess the security posture of vendor "${vendorName}" (${vendorUrl}):

TLS Valid: ${tls_valid ? 'Yes' : 'No'}
Security Headers Score: ${headers_score}/100
Headers Present: ${headers_found.length ? headers_found.join(', ') : 'None'}
Headers Missing: ${headers_missing.length ? headers_missing.join(', ') : 'None'}

Return exactly this JSON:
{
  "ai_risk_summary": "2-3 sentences assessing this vendor's security posture and HIPAA Business Associate risk",
  "overall_status": "Approved" | "Pending Review" | "Requires Review" | "High Risk"
}

Status determination:
- Approved: TLS valid AND headers_score >= 70
- Requires Review: TLS valid AND headers_score 40–69, OR no TLS AND headers_score >= 60
- High Risk: no TLS OR headers_score < 40
- Pending Review: fetch failed entirely (tls_valid=0 and headers_score=0)`,
      }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned) as Pick<VendorScanResult, 'ai_risk_summary' | 'overall_status'>;

    return {
      tls_valid,
      headers_score,
      ai_risk_summary: parsed.ai_risk_summary,
      overall_status: parsed.overall_status,
    };
  } catch (err) {
    console.error('[vendor-scanner] Claude assessment failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}
