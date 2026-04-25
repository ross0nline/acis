import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '../types';
import { setMemory } from '../db/queries';

export interface HeartbeatReport {
  timestamp: string;
  overall_status: 'Green' | 'Yellow' | 'Red';
  summary: string;
  modules: {
    regulatory_pulse: { status: 'Green' | 'Yellow' | 'Red'; summary: string };
    attestation_vault: { status: 'Green' | 'Yellow' | 'Red'; summary: string };
    vendor_risk: { status: 'Green' | 'Yellow' | 'Red'; summary: string };
    incident_response: { status: 'Green' | 'Yellow' | 'Red'; summary: string };
  };
  action_items: string[];
}

export async function runHeartbeat(env: Env): Promise<HeartbeatReport | null> {
  const db = env.ACIS_DB;

  // Collect metrics across all four modules in one D1 batch
  const results = await db.batch<{ v: number }>([
    db.prepare('SELECT COUNT(*) as v FROM regulatory_events'),
    db.prepare("SELECT COUNT(*) as v FROM regulatory_events WHERE ingested_at >= datetime('now', '-1 day')"),
    db.prepare('SELECT COUNT(*) as v FROM regulatory_events WHERE risk_score >= 8'),
    db.prepare('SELECT COUNT(*) as v FROM attestation_vault'),
    db.prepare("SELECT COUNT(*) as v FROM attestation_vault WHERE rxdc_status = 'Overdue' OR gag_clause_status = 'Overdue'"),
    db.prepare("SELECT COUNT(*) as v FROM attestation_vault WHERE rxdc_status = 'Confirmed' AND gag_clause_status = 'Attested'"),
    db.prepare('SELECT COUNT(*) as v FROM vendor_risk'),
    db.prepare("SELECT COUNT(*) as v FROM vendor_risk WHERE overall_status = 'High Risk'"),
    db.prepare("SELECT COUNT(*) as v FROM vendor_risk WHERE scanned_at < datetime('now', '-30 days') OR scanned_at IS NULL"),
    db.prepare('SELECT ROUND(AVG(headers_score)) as v FROM vendor_risk'),
    db.prepare('SELECT COUNT(*) as v FROM incidents'),
    db.prepare("SELECT COUNT(*) as v FROM incidents WHERE status = 'Open'"),
    db.prepare("SELECT COUNT(*) as v FROM incidents WHERE status = 'Open' AND opened_at < datetime('now', '-7 days')"),
  ]);

  const n = (i: number): number => results[i].results[0]?.v ?? 0;

  const metrics = {
    regulatory: { total: n(0), recent_24h: n(1), high_risk: n(2) },
    attestation: { total: n(3), overdue: n(4), compliant: n(5) },
    vendors:     { total: n(6), high_risk: n(7), stale_30d: n(8), avg_score: n(9) },
    incidents:   { total: n(10), open: n(11), stale_open_7d: n(12) },
  };

  // Claude health assessment
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.AI_GATEWAY_URL });
  let report: HeartbeatReport | null = null;

  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: `You are the ACIS system health monitor for a HIPAA compliance operations platform.
You assess module-level health metrics and produce a structured daily heartbeat report.
Respond with valid JSON only — no markdown, no text outside the JSON.`,
      messages: [{
        role: 'user',
        content: `Assess ACIS system health based on today's metrics. Date: ${new Date().toISOString().slice(0, 10)}.

METRICS:
Regulatory Pulse:   ${metrics.regulatory.total} total events | ${metrics.regulatory.recent_24h} ingested last 24h | ${metrics.regulatory.high_risk} high-risk (score ≥ 8)
Attestation Vault:  ${metrics.attestation.total} clients | ${metrics.attestation.overdue} overdue | ${metrics.attestation.compliant} fully compliant
Vendor Risk:        ${metrics.vendors.total} vendors | ${metrics.vendors.high_risk} High Risk | ${metrics.vendors.stale_30d} not scanned in 30+ days | avg headers score ${metrics.vendors.avg_score}/100
Incident Response:  ${metrics.incidents.total} total | ${metrics.incidents.open} open | ${metrics.incidents.stale_open_7d} open 7+ days

STATUS RULES:
- Green:  all nominal — no overdue attestations, stale incidents, or unaddressed High Risk vendors
- Yellow: minor issues — 1-2 overdue records, low vendor scores, or no new regulatory events today
- Red:    critical — multiple overdue, High Risk vendors unaddressed, or incidents stale 7+ days

Return exactly:
{
  "overall_status": "Green" | "Yellow" | "Red",
  "summary": "1-2 sentence overall system assessment",
  "modules": {
    "regulatory_pulse":  { "status": "Green" | "Yellow" | "Red", "summary": "1 sentence" },
    "attestation_vault": { "status": "Green" | "Yellow" | "Red", "summary": "1 sentence" },
    "vendor_risk":       { "status": "Green" | "Yellow" | "Red", "summary": "1 sentence" },
    "incident_response": { "status": "Green" | "Yellow" | "Red", "summary": "1 sentence" }
  },
  "action_items": ["0-3 specific actions required today — empty array if all Green"]
}`,
      }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned) as Omit<HeartbeatReport, 'timestamp'>;
    report = { timestamp: new Date().toISOString(), ...parsed };
  } catch (err) {
    console.error('[heartbeat] Claude assessment failed:', err instanceof Error ? err.message : String(err));
    return null;
  }

  // Persist last report to agent_memory
  await setMemory(db, 'last_heartbeat', JSON.stringify(report));

  // Report to CCC Admin via Service Binding
  try {
    const description = `[${report.overall_status}] ${report.summary}${
      report.action_items.length ? ' Actions: ' + report.action_items.join('; ') : ''
    }`;
    await env.CCC_ADMIN.fetch(new Request('http://internal/internal/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        event_type: 'heartbeat',
        project_slug: 'acis',
        description,
        triggered_by: 'acis-heartbeat',
      }),
    }));
  } catch (err) {
    // CCC Admin unreachable in local dev — log and continue
    console.error('[heartbeat] CCC Admin report failed:', err instanceof Error ? err.message : String(err));
  }

  return report;
}
