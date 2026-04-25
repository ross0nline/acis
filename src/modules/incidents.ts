import { Hono } from 'hono';
import type { Env } from '../types';
import { getIncidents, createIncident, updateIncidentStatus } from '../db/queries';

export const incidentRoutes = new Hono<{ Bindings: Env }>();

// GET /api/incidents — list all incidents
incidentRoutes.get('/', async (c) => {
  const incidents = await getIncidents(c.env.ACIS_DB);
  return c.json(incidents);
});

// GET /api/incidents/:id — single incident with playbook
incidentRoutes.get('/:id', async (c) => {
  const result = await c.env.ACIS_DB
    .prepare('SELECT * FROM incidents WHERE id = ?')
    .bind(Number(c.req.param('id')))
    .first();
  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(result);
});

// POST /api/incidents — open new incident
incidentRoutes.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.incident_type) return c.json({ error: 'incident_type is required' }, 400);
  const id = await createIncident(c.env.ACIS_DB, {
    incident_type: body.incident_type,
    description: body.description ?? null,
    reporter: body.reporter ?? null,
    status: body.status ?? 'Open',
    playbook: body.playbook ?? null,
  });
  return c.json({ ok: true, id }, 201);
});

// PATCH /api/incidents/:id/status — update incident status
incidentRoutes.patch('/:id/status', async (c) => {
  const body = await c.req.json();
  const validStatuses = ['Open', 'Contained', 'Remediated', 'Closed'];
  if (!validStatuses.includes(body.status)) {
    return c.json({ error: `status must be one of: ${validStatuses.join(', ')}` }, 400);
  }
  await updateIncidentStatus(c.env.ACIS_DB, Number(c.req.param('id')), body.status);
  return c.json({ ok: true });
});
