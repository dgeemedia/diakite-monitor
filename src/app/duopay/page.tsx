'use client';

import { diakite } from '@/lib/diakiteClient';
import { usePolling } from '@/lib/usePolling';
import { StatCard, StatusBadge } from '@/components/ui/StatCard';

function formatNGN(amount: number) {
  return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export default function DuoPayPage() {
  const stats = usePolling(diakite.getDuoPayStats, 30000);
  const dp = stats.data;

  const health = !dp ? 'ok' : dp.totalOverdue > 500000 ? 'crit' : dp.totalOverdue > 100000 ? 'warn' : 'ok';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">DuoPay</h1>
        <div className="page-sub">buy-now-pay-later risk monitor</div>
      </div>

      {stats.error && <div className="error-banner">Could not reach Diakite backend: {stats.error}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="stat-label">Portfolio Health</div>
        <div style={{ marginTop: 6 }}>
          <StatusBadge status={health} />
        </div>
      </div>

      <div className="grid grid-4">
        <StatCard label="Total Accounts" value={dp ? dp.totalAccounts : '—'} />
        <StatCard label="Active" value={dp ? dp.activeAccounts : '—'} />
        <StatCard label="Suspended" value={dp ? dp.suspendedAccounts : '—'} />
        <StatCard label="Defaulted" value={dp ? dp.defaultedAccounts : '—'} />
      </div>

      <div className="section-title">Exposure</div>
      <div className="grid grid-2">
        <StatCard label="Total Outstanding" value={dp ? formatNGN(dp.totalOutstanding) : '—'} />
        <StatCard label="Total Overdue" value={dp ? formatNGN(dp.totalOverdue) : '—'} />
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 24 }}>
        This reads live account state. The nightly overdue-check cron (server.js, 6am WAT) isn&apos;t
        tracked separately yet — if it silently skips after a redeploy, these numbers will look
        stale without any indication why. Add a JobRun heartbeat on the backend to close that gap.
      </p>
    </div>
  );
}
