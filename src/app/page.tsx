'use client';

import { diakite } from '@/lib/diakiteClient';
import { usePolling } from '@/lib/usePolling';
import { StatCard, StatusBadge } from '@/components/ui/StatCard';

function formatNGN(amount: number) {
  return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function timeAgo(date: Date | null) {
  if (!date) return '—';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

export default function OverviewPage() {
  const dashboard = usePolling(diakite.getDashboardStats, 20000);
  const payments = usePolling(diakite.getPaymentStats, 20000);
  const shield = usePolling(diakite.getShieldStats, 15000);
  const duopay = usePolling(diakite.getDuoPayStats, 30000);

  const d = dashboard.data;
  const p = payments.data;
  const s = shield.data;
  const dp = duopay.data;

  // Simple client-side thresholds — move these to /api/alerts/evaluate +
  // AlertState once you want persisted, debounced, notified alerts.
  const paymentsHealth: 'ok' | 'warn' | 'crit' = !p
    ? 'ok'
    : p.pendingCount > 25
    ? 'crit'
    : p.pendingCount > 10
    ? 'warn'
    : 'ok';

  const duopayHealth: 'ok' | 'warn' | 'crit' = !dp
    ? 'ok'
    : dp.totalOverdue > 500000
    ? 'crit'
    : dp.totalOverdue > 100000
    ? 'warn'
    : 'ok';

  const anyError = dashboard.error || payments.error || shield.error || duopay.error;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
        </div>
        <div className="page-sub">
          synced {timeAgo(dashboard.lastUpdated)} · auto-refresh 20s
        </div>
      </div>

      {anyError && (
        <div className="error-banner">
          Could not reach Diakite backend: {anyError}. Showing last known values where available.
        </div>
      )}

      <div className="grid grid-4">
        <StatCard
          label="Revenue Today"
          value={d ? formatNGN(d.revenue.today) : '—'}
          delta={d?.deltas.revenue ?? null}
        />
        <StatCard
          label="Active Rides"
          value={d ? d.rides.active : '—'}
        />
        <StatCard
          label="Active Deliveries"
          value={d ? d.deliveries.active : '—'}
        />
        <StatCard
          label="New Users Today"
          value={d ? d.users.newToday : '—'}
          delta={d?.deltas.users ?? null}
        />
      </div>

      <div className="section-title">System Health</div>
      <div className="grid grid-3">
        <div className="card">
          <div className="stat-label">Payments</div>
          <div style={{ margin: '6px 0 10px' }}>
            <StatusBadge status={paymentsHealth} />
          </div>
          <div className="stat-delta" style={{ color: 'var(--muted)' }}>
            {p ? `${p.pendingCount} pending · ${formatNGN(p.todayRevenue)} today` : '—'}
          </div>
        </div>

        <div className="card">
          <div className="stat-label">SHIELD Safety</div>
          <div style={{ margin: '6px 0 10px' }}>
            <StatusBadge status={s && s.activeSessions > 0 ? 'warn' : 'ok'} />
          </div>
          <div className="stat-delta" style={{ color: 'var(--muted)' }}>
            {s ? `${s.activeSessions} active · ${s.alertsTriggered} alerts triggered` : '—'}
          </div>
        </div>

        <div className="card">
          <div className="stat-label">DuoPay</div>
          <div style={{ margin: '6px 0 10px' }}>
            <StatusBadge status={duopayHealth} />
          </div>
          <div className="stat-delta" style={{ color: 'var(--muted)' }}>
            {dp ? `${formatNGN(dp.totalOverdue)} overdue · ${dp.defaultedAccounts} defaulted` : '—'}
          </div>
        </div>
      </div>

      <div className="section-title">Pending Attention</div>
      <div className="grid grid-4">
        <StatCard label="Pending Drivers" value={d ? d.pending.drivers : '—'} />
        <StatCard label="Pending Partners" value={d ? d.pending.partners : '—'} />
        <StatCard label="Open Tickets" value={d ? d.support.openTickets : '—'} />
        <StatCard label="Platform Wallet Balance" value={d ? formatNGN(d.wallet.totalBalance) : '—'} />
      </div>

      {d && (d.suspended.driversCount > 0 || d.suspended.partnersCount > 0) && (
        <>
          <div className="section-title">Recently Suspended</div>
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Reason</th>
                  <th>Suspended</th>
                </tr>
              </thead>
              <tbody>
                {[...d.suspended.driversList.map((u) => ({ ...u, role: 'Driver' })),
                  ...d.suspended.partnersList.map((u) => ({ ...u, role: 'Partner' }))]
                  .sort((a, b) => new Date(b.suspendedAt).getTime() - new Date(a.suspendedAt).getTime())
                  .slice(0, 8)
                  .map((u) => (
                    <tr key={u.id}>
                      <td>{u.firstName} {u.lastName}</td>
                      <td>{u.role}</td>
                      <td>{u.suspensionReason ?? '—'}</td>
                      <td>{new Date(u.suspendedAt).toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
