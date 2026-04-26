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
import { getMemory } from './db/queries';

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
  await runScraper(env);
  await runVendorScan(env);
  await runHeartbeat(env);
};

export default {
  fetch: app.fetch.bind(app),
  scheduled,
};
