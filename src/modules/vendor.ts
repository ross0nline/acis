import { Hono } from 'hono';
import type { Env } from '../types';
import { getVendors, insertVendor } from '../db/queries';

export const vendorRoutes = new Hono<{ Bindings: Env }>();

// GET /api/vendors — list all vendors
vendorRoutes.get('/', async (c) => {
  const vendors = await getVendors(c.env.ACIS_DB);
  return c.json(vendors);
});

// GET /api/vendors/:id — single vendor
vendorRoutes.get('/:id', async (c) => {
  const result = await c.env.ACIS_DB
    .prepare('SELECT * FROM vendor_risk WHERE id = ?')
    .bind(Number(c.req.param('id')))
    .first();
  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(result);
});

// POST /api/vendors — register vendor for scanning
vendorRoutes.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.vendor_name || !body.vendor_url) {
    return c.json({ error: 'vendor_name and vendor_url are required' }, 400);
  }
  await insertVendor(c.env.ACIS_DB, {
    vendor_name: body.vendor_name,
    vendor_url: body.vendor_url,
    contact_email: body.contact_email ?? null,
    tls_valid: body.tls_valid ?? 0,
    headers_score: body.headers_score ?? 0,
    ai_risk_summary: body.ai_risk_summary ?? null,
    overall_status: body.overall_status ?? 'Pending Review',
  });
  return c.json({ ok: true }, 201);
});
