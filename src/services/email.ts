interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(apiKey: string, payload: EmailPayload): Promise<boolean> {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ACIS Compliance <acis@rossonlineservices.com>',
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error('[email] Resend error:', resp.status, err);
    return false;
  }
  return true;
}
