import 'server-only';

// Minimal notification senders. Both are no-ops if their env vars aren't
// set, so /api/alerts/evaluate can run safely before you've wired either up.

export async function sendAlertEmail(subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO;
  if (!apiKey || !to) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Diakite Monitor <alerts@monitor.diakite.internal>',
      to: [to],
      subject: `[Diakite Monitor] ${subject}`,
      text: body,
    }),
  }).catch((err) => console.error('[notify] email send failed:', err));
}

export async function sendAlertSms(message: string) {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID;
  const to = process.env.ALERT_SMS_TO;
  if (!apiKey || !senderId || !to) return;

  await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      from: senderId,
      sms: `[Diakite Monitor] ${message}`,
      type: 'plain',
      channel: 'generic',
      api_key: apiKey,
    }),
  }).catch((err) => console.error('[notify] sms send failed:', err));
}
