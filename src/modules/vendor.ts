import { Hono } from 'hono';
import Anthropic from '@anthropic-ai/sdk';
import type { Env, VendorRisk } from '../types';
import { getVendors, insertVendor, updateVendorScan } from '../db/queries';
import { scanVendor } from '../agents/vendor-scanner';

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

// POST /api/vendors/scan-all — scan every vendor in the DB (admin only)
vendorRoutes.post('/scan-all', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token !== c.env.ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401);

  const vendors = await getVendors(c.env.ACIS_DB);
  const client = new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY, baseURL: c.env.AI_GATEWAY_URL });

  const settled = await Promise.allSettled(
    vendors.map(async (vendor) => {
      const result = await scanVendor(client, vendor.vendor_name, vendor.vendor_url);
      if (result) {
        await updateVendorScan(
          c.env.ACIS_DB,
          vendor.id,
          result.tls_valid,
          result.headers_score,
          result.ai_risk_summary,
          result.overall_status,
        );
      }
      return { id: vendor.id, vendor_name: vendor.vendor_name, ok: !!result };
    })
  );

  const results = settled.map((r) => r.status === 'fulfilled' ? r.value : { ok: false });
  return c.json({ scanned: vendors.length, results });
});

// POST /api/vendors/:id/scan — scan a single vendor on demand (admin only)
vendorRoutes.post('/:id/scan', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token !== c.env.ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401);

  const id = Number(c.req.param('id'));
  const vendor = await c.env.ACIS_DB
    .prepare('SELECT * FROM vendor_risk WHERE id = ?')
    .bind(id)
    .first<VendorRisk>();
  if (!vendor) return c.json({ error: 'Not found' }, 404);

  const client = new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY, baseURL: c.env.AI_GATEWAY_URL });
  const result = await scanVendor(client, vendor.vendor_name, vendor.vendor_url);
  if (!result) return c.json({ error: 'Scan failed' }, 500);

  await updateVendorScan(
    c.env.ACIS_DB,
    id,
    result.tls_valid,
    result.headers_score,
    result.ai_risk_summary,
    result.overall_status,
  );

  return c.json({ ok: true, ...result });
});
