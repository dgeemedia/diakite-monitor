'use client';

import { usePolling } from '@/lib/usePolling';
import { StatusBadge } from '@/components/ui/StatCard';

interface AlertState {
  id: string;
  alertKey: string;
  isActive: boolean;
  severity: 'info' | 'warning' | 'critical';
  message: string | null;
  lastTriggeredAt: string | null;
  lastResolvedAt: string | null;
  updatedAt: string;
}

async function fetchAlerts(): Promise<AlertState[]> {
  const res = await fetch('/api/alerts', { cache: 'no-store' });
  const json = await res.json();
  return json.data.alerts;
}

export default function AlertsPage() {
  const alerts = usePolling(fetchAlerts, 20000);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Alerts</h1>
        <div className="page-sub">evaluated every 5 min via /api/alerts/evaluate (Vercel Cron)</div>
      </div>

      {alerts.error && <div className="error-banner">{alerts.error}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Alert</th>
              <th>Detail</th>
              <th>Last Triggered</th>
            </tr>
          </thead>
          <tbody>
            {alerts.data?.map((a) => (
              <tr key={a.id}>
                <td>
                  <StatusBadge status={a.isActive ? (a.severity === 'critical' ? 'crit' : 'warn') : 'ok'} />
                </td>
                <td>{a.alertKey}</td>
                <td style={{ fontFamily: 'var(--sans)', color: 'var(--muted)' }}>{a.message ?? '—'}</td>
                <td>{a.lastTriggeredAt ? new Date(a.lastTriggeredAt).toLocaleString() : '—'}</td>
              </tr>
            ))}
            {alerts.data?.length === 0 && (
              <tr><td colSpan={4} style={{ color: 'var(--muted)' }}>No alerts recorded yet — the evaluator hasn&apos;t run.</td></tr>
            )}
            {!alerts.data && !alerts.error && (
              <tr><td colSpan={4} style={{ color: 'var(--muted)' }}>Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 24 }}>
        Thresholds live in <code>src/lib/thresholds.ts</code>. Set <code>RESEND_API_KEY</code> +{' '}
        <code>ALERT_EMAIL_TO</code> and/or <code>TERMII_API_KEY</code> + <code>ALERT_SMS_TO</code> in
        your Vercel env vars to get notified when one fires.
      </p>
    </div>
  );
}
