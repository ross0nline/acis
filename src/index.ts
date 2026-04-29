import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

import { regulatoryRoutes } from './modules/regulatory';
import { attestationRoutes } from './modules/attestation';
import { vendorRoutes } from './modules/vendor';
import { incidentRoutes } from './modules/incidents';
import { runScraper } from './agents/scraper';
import { runHeartbeat } from './agents/heartbeat';
import { runVendorScan } from './agents/vendor-scanner';
import { runAttestationReminders } from './agents/attestation-reminder';
import { runIncidentEscalation } from './agents/incident-escalation';
import { getMemory } from './db/queries';
import { createCompliancePR } from './services/github';

interface GatewayLog {
  id: string;
  created_at: string;
  model: string;
  provider: string;
  status_code: number;
  tokens_in: number;
  tokens_out: number;
  duration: number;
  success: boolean;
  cached: boolean;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

// Auth middleware — protects all write operations
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'GET') return next();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token !== c.env.ADMIN_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return next();
});

// Health check
app.get('/', (c) => c.json({ status: 'ok', system: 'ACIS', version: '1.0.0' }));

// Live system status — consumed by CCC Admin dashboard
app.get('/api/status', async (c) => {
  const [eventsCount, attTotal, attOverdue, vendTotal, vendHighRisk, incTotal, incOpen] =
    await c.env.ACIS_DB.batch([
      c.env.ACIS_DB.prepare('SELECT COUNT(*) as count FROM regulatory_events'),
      c.env.ACIS_DB.prepare('SELECT COUNT(*) as count FROM attestation_vault'),
      c.env.ACIS_DB.prepare("SELECT COUNT(*) as count FROM attestation_vault WHERE rxdc_status='Overdue' OR gag_clause_status='Overdue'"),
      c.env.ACIS_DB.prepare('SELECT COUNT(*) as count FROM vendor_risk'),
      c.env.ACIS_DB.prepare("SELECT COUNT(*) as count FROM vendor_risk WHERE overall_status='High Risk'"),
      c.env.ACIS_DB.prepare('SELECT COUNT(*) as count FROM incidents'),
      c.env.ACIS_DB.prepare("SELECT COUNT(*) as count FROM incidents WHERE status='Open'"),
    ]);

  const heartbeatRaw = await getMemory(c.env.ACIS_DB, 'last_heartbeat');
  const hb = heartbeatRaw ? JSON.parse(heartbeatRaw) : null;

  return c.json({
    system: 'ACIS',
    timestamp: new Date().toISOString(),
    url: 'https://acis.rossonlineservices.com',
    heartbeat: hb ? { overall: hb.overall_status, last_run: hb.timestamp, summary: hb.summary } : null,
    modules: {
      regulatory_events: (eventsCount.results[0] as { count: number }).count,
      attestation: {
        total: (attTotal.results[0] as { count: number }).count,
        overdue: (attOverdue.results[0] as { count: number }).count,
      },
      vendors: {
        total: (vendTotal.results[0] as { count: number }).count,
        high_risk: (vendHighRisk.results[0] as { count: number }).count,
      },
      incidents: {
        total: (incTotal.results[0] as { count: number }).count,
        open: (incOpen.results[0] as { count: number }).count,
      },
    },
    agents: {
      scraper: true,
      vendor_scanner: true,
      attestation_reminders: !!c.env.RESEND_API_KEY,
      incident_escalation: !!c.env.RESEND_API_KEY,
      heartbeat: true,
      github_pr_automation: !!c.env.GITHUB_TOKEN,
    },
  });
});

// Module routes
app.route('/api/regulatory', regulatoryRoutes);
app.route('/api/attestation', attestationRoutes);
app.route('/api/vendors', vendorRoutes);
app.route('/api/incidents', incidentRoutes);

// Manual scraper trigger — admin only, used for testing and on-demand ingestion
app.post('/api/scraper/run', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token !== c.env.ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401);
  const result = await runScraper(c.env);
  return c.json({ ok: true, ...result });
});

// Demo PR — creates a GitHub PR for the highest-risk event in D1
app.post('/api/scraper/demo-pr', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token !== c.env.ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401);
  const event = await c.env.ACIS_DB
    .prepare('SELECT * FROM regulatory_events ORDER BY risk_score DESC, ingested_at DESC LIMIT 1')
    .first<import('./types').RegulatoryEvent>();
  if (!event) return c.json({ error: 'No events in database' }, 404);
  const scored = event.remediation_steps ? JSON.parse(event.remediation_steps) : null;
  await createCompliancePR(c.env, event, scored);
  return c.json({ ok: true, event_id: event.id, title: event.title, risk_score: event.risk_score });
});

// Demo PR + email — creates a synthetic high-risk event to test the full email notification path
app.post('/api/scraper/demo-pr-email', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token !== c.env.ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401);
  const syntheticId = Date.now();
  const syntheticEvent: import('./types').RegulatoryEvent = {
    id: syntheticId,
    title: `[TEST] ACIS Compliance Alert Email Verification — ${new Date().toISOString()}`,
    source: 'ACIS-TEST',
    url: 'https://acis.rossonlineservices.com',
    published_date: new Date().toISOString().split('T')[0],
    risk_score: 9,
    summary: 'Synthetic event generated to verify the compliance alert email notification path. Not a real regulatory event.',
    tags: 'test',
    remediation_steps: null,
    ingested_at: new Date().toISOString(),
  };
  const scored = {
    risk_level: 'High' as const,
    impacted_field: 'HIPAA' as const,
    summary: 'Synthetic test event — verifying that the email notification fires correctly on PR creation.',
    remediation_step: 'No action required. This is a test.',
    deadline: '',
  };
  await createCompliancePR(c.env, syntheticEvent, scored);
  return c.json({ ok: true, test_event_id: syntheticId, message: 'Synthetic PR + email triggered — check your inbox.' });
});

// Heartbeat — last stored report and manual trigger
app.get('/api/heartbeat/last', async (c) => {
  const raw = await getMemory(c.env.ACIS_DB, 'last_heartbeat');
  if (!raw) return c.json({ error: 'No heartbeat on record yet' }, 404);
  return c.json(JSON.parse(raw));
});

app.post('/api/heartbeat/run', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token !== c.env.ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401);
  const report = await runHeartbeat(c.env);
  if (!report) return c.json({ error: 'Heartbeat generation failed' }, 500);
  return c.json({ ok: true, ...report });
});

// Agent Logs — proxies AI Gateway request log (requires CF_API_TOKEN secret)
app.get('/api/logs', async (c) => {
  if (!c.env.CF_API_TOKEN) {
    return c.json({ logs: [], configured: false });
  }
  const [accountId, gatewaySlug] = c.env.AI_GATEWAY_URL.split('/v1/')[1].split('/');
  const resp = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai-gateway/gateways/${gatewaySlug}/logs?order_by=created_at&direction=desc&per_page=25`,
    { headers: { 'Authorization': `Bearer ${c.env.CF_API_TOKEN}` } }
  );
  if (!resp.ok) return c.json({ logs: [], configured: true, error: `Gateway API returned ${resp.status}` });
  const data = await resp.json() as { result: GatewayLog[] };
  return c.json({ logs: data.result ?? [], configured: true });
});

// Internal service binding endpoint (called by agents via Service Binding)
app.post('/internal/event', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token !== c.env.ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{ event_type: string; module: string; description: string }>();

  await c.env.CCC_ADMIN.fetch(new Request('http://internal/internal/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${c.env.ADMIN_TOKEN}` },
    body: JSON.stringify({
      event_type: body.event_type,
      project_slug: 'acis',
      description: body.description,
      triggered_by: `acis-${body.module}`,
    }),
  }));

  return c.json({ ok: true });
});

// Scheduled handler — runs daily at 08:00 UTC
const scheduled: ExportedHandlerScheduledHandler<Env> = async (_event, env) => {
  const steps: Array<[string, () => Promise<unknown>]> = [
    ['scraper',               () => runScraper(env)],
    ['vendor-scan',           () => runVendorScan(env)],
    ['attestation-reminders', () => runAttestationReminders(env)],
    ['incident-escalation',   () => runIncidentEscalation(env)],
    ['heartbeat',             () => runHeartbeat(env)],
  ];

  for (const [name, fn] of steps) {
    try {
      await fn();
      console.log(`[scheduled] ${name} completed`);
    } catch (err) {
      console.error(`[scheduled] ${name} failed:`, err instanceof Error ? err.message : String(err));
    }
  }
};

export default {
  fetch: app.fetch.bind(app),
  scheduled,
};
