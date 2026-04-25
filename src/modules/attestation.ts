import { Hono } from 'hono';
import type { Env } from '../types';
import { getAttestationRecords, updateAttestationStatus, upsertAttestationRecord } from '../db/queries';

export const attestationRoutes = new Hono<{ Bindings: Env }>();

// GET /api/attestation — list all records with completion summary
attestationRoutes.get('/', async (c) => {
  const records = await getAttestationRecords(c.env.ACIS_DB);
  const total = records.length;
  const rxdc_complete = records.filter(r => r.rxdc_status === 'Confirmed').length;
  const gag_complete = records.filter(r => r.gag_clause_status === 'Attested').length;

  return c.json({
    summary: {
      total,
      rxdc_completion_pct: total ? Math.round((rxdc_complete / total) * 100) : 0,
      gag_clause_completion_pct: total ? Math.round((gag_complete / total) * 100) : 0,
    },
    records,
  });
});

// GET /api/attestation/:id — single record
attestationRoutes.get('/:id', async (c) => {
  const result = await c.env.ACIS_DB
    .prepare('SELECT * FROM attestation_vault WHERE id = ?')
    .bind(Number(c.req.param('id')))
    .first();
  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(result);
});

// POST /api/attestation — create record
attestationRoutes.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.client_name) return c.json({ error: 'client_name is required' }, 400);
  await upsertAttestationRecord(c.env.ACIS_DB, {
    client_name: body.client_name,
    pbm_name: body.pbm_name ?? null,
    rxdc_status: body.rxdc_status ?? 'Pending',
    gag_clause_status: body.gag_clause_status ?? 'Not Started',
    last_contact_date: body.last_contact_date ?? null,
    r2_folder_path: body.r2_folder_path ?? null,
  });
  return c.json({ ok: true }, 201);
});

// PATCH /api/attestation/:id/status — update compliance status
attestationRoutes.patch('/:id/status', async (c) => {
  const body = await c.req.json();
  await updateAttestationStatus(
    c.env.ACIS_DB,
    Number(c.req.param('id')),
    body.rxdc_status,
    body.gag_clause_status
  );
  return c.json({ ok: true });
});
