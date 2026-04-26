import type { Env, Incident } from '../types';
import { getStaleIncidents } from '../db/queries';
import { sendEmail } from '../services/email';

const ADMIN_EMAIL = 'rossonlineservices@gmail.com';
const DASHBOARD_URL = 'https://acis.rossonlineservices.com';
const HIPAA_WINDOW_DAYS = 60;

function daysOpen(openedAt: string): number {
  return Math.floor((Date.now() - new Date(openedAt).getTime()) / 86_400_000);
}

function buildEmailBody(incidents: Incident[]): { html: string; text: string } {
  const rows = incidents.map(inc => {
    const days = daysOpen(inc.opened_at);
    const remaining = HIPAA_WINDOW_DAYS - days;
    const urgency = days >= 45 ? '#dc2626' : days >= 21 ? '#d97706' : '#374151';
    const ocrWarning = remaining <= 15
      ? `<span style="color:#dc2626;font-weight:600">${remaining}d to OCR window</span>`
      : remaining <= 30
        ? `<span style="color:#d97706">${remaining}d to OCR window</span>`
        : `${remaining}d remaining`;

    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">#${inc.id} — ${inc.incident_type}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${urgency};font-weight:600">${days} days</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${ocrWarning}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">${inc.reporter ?? '—'}</td>
    </tr>`;
  }).join('');

  const critical = incidents.filter(i => daysOpen(i.opened_at) >= 45);
  const alertLine = critical.length > 0
    ? `<p style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px 16px;color:#dc2626;font-weight:600;margin:0 0 16px">
        ⚠️ ${critical.length} incident${critical.length > 1 ? 's' : ''} approaching the 60-day HIPAA Breach Notification Rule reporting window.
       </p>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;max-width:620px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 4px">ACIS Incident Escalation Alert</h2>
  <p style="margin:0 0 20px;color:#6b7280;font-size:14px">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  ${alertLine}
  <p style="margin:0 0 16px">${incidents.length} open incident${incidents.length > 1 ? 's have' : ' has'} been unresolved for 7+ days and require attention.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead>
      <tr style="background:#f9fafb">
        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Incident</th>
        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Days Open</th>
        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb">OCR Window</th>
        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Reporter</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin:20px 0 8px;font-size:14px;color:#6b7280">
    The HIPAA Breach Notification Rule (45 CFR § 164.404) requires OCR notification within 60 days of discovery for reportable breaches.
  </p>
  <p style="margin:0 0 0;font-size:14px">
    <a href="${DASHBOARD_URL}" style="color:#2563eb">Open ACIS Dashboard →</a>
  </p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
  <p style="font-size:12px;color:#9ca3af;margin:0">Automated escalation from ACIS. No PHI is included in this communication.</p>
</body>
</html>`;

  const text = [
    'ACIS Incident Escalation Alert',
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    '',
    `${incidents.length} open incident${incidents.length > 1 ? 's' : ''} unresolved for 7+ days:`,
    '',
    ...incidents.map(i => {
      const days = daysOpen(i.opened_at);
      return `  #${i.id} ${i.incident_type} — ${days} days open (${HIPAA_WINDOW_DAYS - days}d to OCR window) — Reporter: ${i.reporter ?? 'Unknown'}`;
    }),
    '',
    'HIPAA Breach Notification Rule (45 CFR § 164.404): OCR notification required within 60 days of discovery.',
    '',
    `Dashboard: ${DASHBOARD_URL}`,
    '',
    'No PHI is included in this communication.',
  ].join('\n');

  return { html, text };
}

export async function runIncidentEscalation(env: Env): Promise<{ sent: boolean; stale_count: number }> {
  if (!env.RESEND_API_KEY) {
    console.warn('[incident-escalation] RESEND_API_KEY not configured — skipping');
    return { sent: false, stale_count: 0 };
  }

  const stale = await getStaleIncidents(env.ACIS_DB, 7);
  if (stale.length === 0) return { sent: false, stale_count: 0 };

  const maxDays = Math.max(...stale.map(i => daysOpen(i.opened_at)));
  const subject = maxDays >= 45
    ? `[ACIS] ⚠️ URGENT — Incident approaching HIPAA OCR window (${maxDays} days open)`
    : `[ACIS] Incident Escalation — ${stale.length} open incident${stale.length > 1 ? 's' : ''} unresolved 7+ days`;

  const { html, text } = buildEmailBody(stale);
  const sent = await sendEmail(env.RESEND_API_KEY, { to: ADMIN_EMAIL, subject, html, text });
  return { sent, stale_count: stale.length };
}
