import type { RegulatoryEvent, AttestationRecord, VendorRisk, Incident, AgentMemory } from '../types';

// ── Regulatory Events ──────────────────────────────────────────────────────

export async function getRegulatoryEvents(db: D1Database, limit = 50): Promise<RegulatoryEvent[]> {
  const result = await db
    .prepare('SELECT * FROM regulatory_events ORDER BY ingested_at DESC LIMIT ?')
    .bind(limit)
    .all<RegulatoryEvent>();
  return result.results;
}

export async function insertRegulatoryEvent(
  db: D1Database,
  event: Omit<RegulatoryEvent, 'id' | 'ingested_at'>
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO regulatory_events
        (source, title, url, published_date, risk_score, summary, tags, remediation_steps)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      event.source,
      event.title,
      event.url,
      event.published_date,
      event.risk_score,
      event.summary,
      event.tags,
      event.remediation_steps
    )
    .run();
}

// ── Attestation Vault ──────────────────────────────────────────────────────

export async function getAttestationRecords(db: D1Database): Promise<AttestationRecord[]> {
  const result = await db
    .prepare('SELECT * FROM attestation_vault ORDER BY client_name ASC')
    .all<AttestationRecord>();
  return result.results;
}

export async function upsertAttestationRecord(
  db: D1Database,
  record: Omit<AttestationRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO attestation_vault (client_name, pbm_name, rxdc_status, gag_clause_status, last_contact_date, r2_folder_path)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         rxdc_status = excluded.rxdc_status,
         gag_clause_status = excluded.gag_clause_status,
         last_contact_date = excluded.last_contact_date,
         r2_folder_path = excluded.r2_folder_path,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      record.client_name,
      record.pbm_name,
      record.rxdc_status,
      record.gag_clause_status,
      record.last_contact_date,
      record.r2_folder_path
    )
    .run();
}

export async function updateAttestationStatus(
  db: D1Database,
  id: number,
  rxdc_status: AttestationRecord['rxdc_status'],
  gag_clause_status: AttestationRecord['gag_clause_status']
): Promise<void> {
  await db
    .prepare(
      `UPDATE attestation_vault
       SET rxdc_status = ?, gag_clause_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(rxdc_status, gag_clause_status, id)
    .run();
}

// ── Vendor Risk ────────────────────────────────────────────────────────────

export async function getVendors(db: D1Database): Promise<VendorRisk[]> {
  const result = await db
    .prepare('SELECT * FROM vendor_risk ORDER BY scanned_at DESC')
    .all<VendorRisk>();
  return result.results;
}

export async function insertVendor(
  db: D1Database,
  vendor: Omit<VendorRisk, 'id' | 'scanned_at'>
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO vendor_risk
        (vendor_name, vendor_url, contact_email, tls_valid, headers_score, ai_risk_summary, overall_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      vendor.vendor_name,
      vendor.vendor_url,
      vendor.contact_email,
      vendor.tls_valid,
      vendor.headers_score,
      vendor.ai_risk_summary,
      vendor.overall_status
    )
    .run();
}

export async function updateVendorScan(
  db: D1Database,
  id: number,
  tls_valid: number,
  headers_score: number,
  ai_risk_summary: string,
  overall_status: VendorRisk['overall_status'],
): Promise<void> {
  await db
    .prepare(
      `UPDATE vendor_risk
       SET tls_valid = ?, headers_score = ?, ai_risk_summary = ?, overall_status = ?, scanned_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(tls_valid, headers_score, ai_risk_summary, overall_status, id)
    .run();
}

// ── Incidents ──────────────────────────────────────────────────────────────

export async function getIncidents(db: D1Database): Promise<Incident[]> {
  const result = await db
    .prepare('SELECT * FROM incidents ORDER BY opened_at DESC')
    .all<Incident>();
  return result.results;
}

export async function createIncident(
  db: D1Database,
  incident: Omit<Incident, 'id' | 'opened_at' | 'closed_at'>
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO incidents (incident_type, description, reporter, status, playbook)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(
      incident.incident_type,
      incident.description,
      incident.reporter,
      incident.status,
      incident.playbook
    )
    .run();
  return result.meta.last_row_id;
}

export async function updateIncidentStatus(
  db: D1Database,
  id: number,
  status: Incident['status']
): Promise<void> {
  const closed_at = status === 'Closed' ? new Date().toISOString() : null;
  await db
    .prepare('UPDATE incidents SET status = ?, closed_at = ? WHERE id = ?')
    .bind(status, closed_at, id)
    .run();
}

export async function updateIncidentPlaybook(
  db: D1Database,
  id: number,
  playbook: string,
): Promise<void> {
  await db
    .prepare('UPDATE incidents SET playbook = ? WHERE id = ?')
    .bind(playbook, id)
    .run();
}

// ── Agent Memory ───────────────────────────────────────────────────────────

export async function getMemory(db: D1Database, key: string): Promise<string | null> {
  const result = await db
    .prepare('SELECT context_value FROM agent_memory WHERE context_key = ?')
    .bind(key)
    .first<AgentMemory>();
  return result?.context_value ?? null;
}

export async function setMemory(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO agent_memory (context_key, context_value)
       VALUES (?, ?)
       ON CONFLICT(context_key) DO UPDATE SET
         context_value = excluded.context_value,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(key, value)
    .run();
}
