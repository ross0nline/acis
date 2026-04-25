import { Hono } from 'hono';
import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '../types';
import { getIncidents, createIncident, updateIncidentStatus, updateIncidentPlaybook } from '../db/queries';
import { generatePlaybook } from '../agents/playbook';

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

// POST /api/incidents — open new incident, auto-generate NIST 800-61 playbook
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

  // Generate NIST 800-61 playbook asynchronously unless one was supplied in the body
  if (!body.playbook) {
    const client = new Anthropic({
      apiKey: c.env.ANTHROPIC_API_KEY,
      baseURL: c.env.AI_GATEWAY_URL,
    });
    const playbook = await generatePlaybook(
      client,
      body.incident_type,
      body.description ?? '',
      body.reporter ?? null,
    );
    if (playbook) {
      await updateIncidentPlaybook(c.env.ACIS_DB, id, JSON.stringify(playbook));
    }
  }

  return c.json({ ok: true, id }, 201);
});

// POST /api/incidents/:id/playbook — (re)generate playbook for an existing incident
incidentRoutes.post('/:id/playbook', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token !== c.env.ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401);

  const incident = await c.env.ACIS_DB
    .prepare('SELECT * FROM incidents WHERE id = ?')
    .bind(Number(c.req.param('id')))
    .first<{ incident_type: string; description: string | null; reporter: string | null }>();
  if (!incident) return c.json({ error: 'Not found' }, 404);

  const client = new Anthropic({
    apiKey: c.env.ANTHROPIC_API_KEY,
    baseURL: c.env.AI_GATEWAY_URL,
  });

  const playbook = await generatePlaybook(
    client,
    incident.incident_type,
    incident.description ?? '',
    incident.reporter ?? null,
  );

  if (!playbook) return c.json({ error: 'Playbook generation failed' }, 500);

  await updateIncidentPlaybook(c.env.ACIS_DB, Number(c.req.param('id')), JSON.stringify(playbook));
  return c.json({ ok: true, playbook });
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
