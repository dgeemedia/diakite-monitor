'use client';

import { diakite } from '@/lib/diakiteClient';
import { usePolling } from '@/lib/usePolling';
import { StatCard, StatusBadge } from '@/components/ui/StatCard';

export default function ShieldPage() {
  const stats = usePolling(diakite.getShieldStats, 10000); // safety feature — tighter poll interval
  const s = stats.data;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">SHIELD</h1>
        <div className="page-sub">safety feature · auto-refresh 10s</div>
      </div>

      {stats.error && <div className="error-banner">Could not reach Diakite backend: {stats.error}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="stat-label">Status</div>
        <div style={{ marginTop: 6 }}>
          <StatusBadge status={s && s.activeSessions > 0 ? 'warn' : 'ok'} />
        </div>
      </div>

      <div className="grid grid-4">
        <StatCard label="Active Sessions" value={s ? s.activeSessions : '—'} />
        <StatCard label="Sessions Today" value={s ? s.sessionsToday : '—'} />
        <StatCard label="Alerts Triggered" value={s ? s.alertsTriggered : '—'} />
        <StatCard label="Arrived Safe Today" value={s ? s.arrivedSafe : '—'} />
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 24 }}>
        This is a safety-critical feature — treat any sustained rise in &quot;alerts triggered&quot;
        relative to &quot;arrived safe&quot; as worth investigating immediately, not just logging.
        Wire an SMS/WhatsApp alert on this page first when you get to /alerts.
      </p>
    </div>
  );
}
