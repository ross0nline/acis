import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpHandler } from 'agents/mcp';
import { z } from 'zod';
import type { Env } from './types';

function createAcisServer(env: Env): McpServer {
  const server = new McpServer({ name: 'ACIS', version: '1.0.0' });

  server.tool(
    'list_regulatory_events',
    'Retrieve regulatory events from the ACIS compliance database. Filter by risk level to focus on high-priority items. Risk score: high=8-10, medium=5-7, low=0-4.',
    {
      risk_level: z.enum(['all', 'high', 'medium', 'low']).optional().describe('Filter by risk level'),
      limit: z.number().min(1).max(200).optional().describe('Max events to return (default 50)'),
    },
    async ({ risk_level = 'all', limit = 50 }) => {
      let where = '';
      if (risk_level === 'high') where = 'WHERE risk_score >= 8';
      else if (risk_level === 'medium') where = 'WHERE risk_score >= 5 AND risk_score < 8';
      else if (risk_level === 'low') where = 'WHERE risk_score < 5';

      const result = await env.ACIS_DB
        .prepare(`SELECT id, source, title, url, published_date, risk_score, summary, tags, ingested_at FROM regulatory_events ${where} ORDER BY ingested_at DESC LIMIT ?`)
        .bind(limit)
        .all();

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ count: result.results.length, events: result.results }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'list_incidents',
    'Retrieve compliance incidents from the ACIS incident response module. Each incident has a NIST SP 800-61 Rev 2 playbook with severity classification, HIPAA reportability, and response guidance.',
    {
      status: z.enum(['Open', 'Contained', 'Remediated', 'Closed', 'all']).optional().describe('Filter by status (default: all)'),
    },
    async ({ status = 'all' }) => {
      const statusClause = status !== 'all'
        ? 'WHERE status = ?'
        : '';
      const stmt = status !== 'all'
        ? env.ACIS_DB.prepare(`SELECT id, incident_type, description, reporter, status, opened_at, closed_at FROM incidents ${statusClause} ORDER BY CASE status WHEN 'Open' THEN 0 WHEN 'Contained' THEN 1 WHEN 'Remediated' THEN 2 ELSE 3 END ASC, opened_at ASC`).bind(status)
        : env.ACIS_DB.prepare(`SELECT id, incident_type, description, reporter, status, opened_at, closed_at FROM incidents ORDER BY CASE status WHEN 'Open' THEN 0 WHEN 'Contained' THEN 1 WHEN 'Remediated' THEN 2 ELSE 3 END ASC, opened_at ASC`);

      const result = await stmt.all();
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ count: result.results.length, incidents: result.results }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'list_vendors',
    'Retrieve vendor security assessments from the ACIS Vendor Risk module. Each vendor record includes TLS certificate validity, HTTP security header scores (0-100), and a HIPAA Business Associate risk summary from Claude.',
    {
      status: z.enum(['High Risk', 'Requires Review', 'Approved', 'Pending Review', 'all']).optional().describe('Filter by overall risk status'),
    },
    async ({ status = 'all' }) => {
      const stmt = status !== 'all'
        ? env.ACIS_DB.prepare('SELECT id, vendor_name, vendor_url, tls_valid, headers_score, overall_status, ai_risk_summary, scanned_at FROM vendor_risk WHERE overall_status = ? ORDER BY scanned_at DESC').bind(status)
        : env.ACIS_DB.prepare('SELECT id, vendor_name, vendor_url, tls_valid, headers_score, overall_status, ai_risk_summary, scanned_at FROM vendor_risk ORDER BY scanned_at DESC');

      const result = await stmt.all();
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ count: result.results.length, vendors: result.results }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'list_attestations',
    'Retrieve RxDC and Gag Clause attestation records for all client plans tracked in the ACIS Attestation Vault. Tracks status lifecycle: Pending → Submitted → Confirmed → Overdue.',
    {
      overdue_only: z.boolean().optional().describe('If true, return only records with Overdue status in RxDC or Gag Clause'),
    },
    async ({ overdue_only = false }) => {
      const stmt = overdue_only
        ? env.ACIS_DB.prepare("SELECT id, client_name, pbm_name, rxdc_status, gag_clause_status, last_contact_date FROM attestation_vault WHERE rxdc_status = 'Overdue' OR gag_clause_status = 'Overdue' ORDER BY client_name ASC")
        : env.ACIS_DB.prepare('SELECT id, client_name, pbm_name, rxdc_status, gag_clause_status, last_contact_date FROM attestation_vault ORDER BY client_name ASC');

      const result = await stmt.all();
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ count: result.results.length, attestations: result.results }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'get_system_status',
    'Get a high-level summary of all ACIS compliance modules: total and high-risk regulatory events, overdue attestations, high-risk vendors, and open incidents.',
    {},
    async () => {
      const [eventsCount, highRisk, attTotal, attOverdue, vendTotal, vendHighRisk, incTotal, incOpen] =
        await env.ACIS_DB.batch([
          env.ACIS_DB.prepare('SELECT COUNT(*) as count FROM regulatory_events'),
          env.ACIS_DB.prepare('SELECT COUNT(*) as count FROM regulatory_events WHERE risk_score >= 8'),
          env.ACIS_DB.prepare('SELECT COUNT(*) as count FROM attestation_vault'),
          env.ACIS_DB.prepare("SELECT COUNT(*) as count FROM attestation_vault WHERE rxdc_status='Overdue' OR gag_clause_status='Overdue'"),
          env.ACIS_DB.prepare('SELECT COUNT(*) as count FROM vendor_risk'),
          env.ACIS_DB.prepare("SELECT COUNT(*) as count FROM vendor_risk WHERE overall_status='High Risk'"),
          env.ACIS_DB.prepare('SELECT COUNT(*) as count FROM incidents'),
          env.ACIS_DB.prepare("SELECT COUNT(*) as count FROM incidents WHERE status='Open'"),
        ]);

      const summary = {
        timestamp: new Date().toISOString(),
        regulatory_events: {
          total: (eventsCount.results[0] as { count: number }).count,
          high_risk: (highRisk.results[0] as { count: number }).count,
        },
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
      };

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(summary, null, 2),
        }],
      };
    }
  );

  server.tool(
    'get_heartbeat_report',
    'Retrieve the latest ACIS Heartbeat Agent report: a structured Green/Yellow/Red health audit across all four compliance modules, with specific action items. Runs daily at 08:00 UTC.',
    {},
    async () => {
      const row = await env.ACIS_DB
        .prepare("SELECT context_value FROM agent_memory WHERE context_key = 'last_heartbeat'")
        .first<{ context_value: string }>();

      if (!row) {
        return {
          content: [{ type: 'text' as const, text: 'No heartbeat report available yet. The heartbeat agent runs daily at 08:00 UTC.' }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: row.context_value }],
      };
    }
  );

  return server;
}

export function createAcisMcpHandler(env: Env) {
  const server = createAcisServer(env);
  return createMcpHandler(server);
}
