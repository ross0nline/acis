import { Hono } from 'hono';
import type { Env } from '../types';
import { getRegulatoryEvents, insertRegulatoryEvent } from '../db/queries';

export const regulatoryRoutes = new Hono<{ Bindings: Env }>();

// GET /api/regulatory — list all regulatory events
regulatoryRoutes.get('/', async (c) => {
  const limit = Number(c.req.query('limit') ?? 50);
  const events = await getRegulatoryEvents(c.env.ACIS_DB, limit);
  return c.json(events);
});

// GET /api/regulatory/:id — single event
regulatoryRoutes.get('/:id', async (c) => {
  const result = await c.env.ACIS_DB
    .prepare('SELECT * FROM regulatory_events WHERE id = ?')
    .bind(Number(c.req.param('id')))
    .first();
  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(result);
});

// POST /api/regulatory — manual event ingestion (admin)
regulatoryRoutes.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.source || !body.title || !body.url) {
    return c.json({ error: 'source, title, and url are required' }, 400);
  }
  await insertRegulatoryEvent(c.env.ACIS_DB, {
    source: body.source,
    title: body.title,
    url: body.url,
    published_date: body.published_date ?? null,
    risk_score: body.risk_score ?? 0,
    summary: body.summary ?? null,
    tags: body.tags ?? null,
    remediation_steps: body.remediation_steps ?? null,
  });
  return c.json({ ok: true }, 201);
});
