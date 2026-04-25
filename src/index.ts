import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

import { regulatoryRoutes } from './modules/regulatory';
import { attestationRoutes } from './modules/attestation';
import { vendorRoutes } from './modules/vendor';
import { incidentRoutes } from './modules/incidents';

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

// Internal service binding endpoint (called by agents via Service Binding)
app.post('/internal/event', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token !== c.env.ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{ event_type: string; module: string; description: string }>();

  // Forward to CCC Admin activity log
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

export default app;
