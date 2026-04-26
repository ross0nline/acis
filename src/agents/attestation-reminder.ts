import type { Env, AttestationRecord } from '../types';
import { getAttestationRecords } from '../db/queries';
import { sendEmail } from '../services/email';

const ADMIN_EMAIL = 'rossonlineservices@gmail.com';
const DASHBOARD_URL = 'https://acis.rossonlineservices.com';

function buildEmailBody(overdue: AttestationRecord[]): { html: string; text: string } {
  const rxdcOverdue = overdue.filter(r => r.rxdc_status === 'Overdue');
  const gagOverdue = overdue.filter(r => r.gag_clause_status === 'Overdue');

  const rows = overdue.map(r => {
    const rxdc = r.rxdc_status === 'Overdue' ? '⚠️ Overdue' : r.rxdc_status;
    const gag = r.gag_clause_status === 'Overdue' ? '⚠️ Overdue' : r.gag_clause_status;
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${r.client_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${r.rxdc_status === 'Overdue' ? '#dc2626' : '#374151'}">${rxdc}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${r.gag_clause_status === 'Overdue' ? '#dc2626' : '#374151'}">${gag}</td>
    </tr>`;
  }).join('');

  const summary = [
    rxdcOverdue.length > 0 ? `${rxdcOverdue.length} client plan${rxdcOverdue.length > 1 ? 's' : ''} with overdue RxDC submission` : '',
    gagOverdue.length > 0 ? `${gagOverdue.length} client plan${gagOverdue.length > 1 ? 's' : ''} with overdue Gag Clause attestation` : '',
  ].filter(Boolean).join(' · ');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 4px">ACIS Attestation Reminder</h2>
  <p style="margin:0 0 20px;color:#6b7280;font-size:14px">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  <p style="margin:0 0 16px">The following client plans require attention: <strong>${summary}</strong></p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead>
      <tr style="background:#f9fafb">
        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Client Plan</th>
        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb">RxDC Status</th>
        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Gag Clause Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin:20px 0 0;font-size:14px">
    <a href="${DASHBOARD_URL}" style="color:#2563eb">Open ACIS Dashboard →</a>
  </p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
  <p style="font-size:12px;color:#9ca3af;margin:0">This is an automated reminder from ACIS. No PHI is included in this communication.</p>
</body>
</html>`;

  const text = [
    'ACIS Attestation Reminder',
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    '',
    summary,
    '',
    ...overdue.map(r => `${r.client_name}: RxDC=${r.rxdc_status}, Gag Clause=${r.gag_clause_status}`),
    '',
    `Dashboard: ${DASHBOARD_URL}`,
    '',
    'No PHI is included in this communication.',
  ].join('\n');

  return { html, text };
}

export async function runAttestationReminders(env: Env): Promise<{ sent: boolean; overdue_count: number }> {
  if (!env.RESEND_API_KEY) {
    console.warn('[attestation-reminder] RESEND_API_KEY not configured — skipping');
    return { sent: false, overdue_count: 0 };
  }

  const records = await getAttestationRecords(env.ACIS_DB);
  const overdue = records.filter(
    r => r.rxdc_status === 'Overdue' || r.gag_clause_status === 'Overdue'
  );

  if (overdue.length === 0) return { sent: false, overdue_count: 0 };

  const overdueCount = overdue.filter(r => r.rxdc_status === 'Overdue').length +
    overdue.filter(r => r.gag_clause_status === 'Overdue').length;

  const { html, text } = buildEmailBody(overdue);
  const subject = `[ACIS] Attestation Reminder — ${overdueCount} overdue obligation${overdueCount > 1 ? 's' : ''}`;

  const sent = await sendEmail(env.RESEND_API_KEY, { to: ADMIN_EMAIL, subject, html, text });
  return { sent, overdue_count: overdue.length };
}
