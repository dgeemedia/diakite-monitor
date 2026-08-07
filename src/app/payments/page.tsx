'use client';

import { diakite } from '@/lib/diakiteClient';
import { usePolling } from '@/lib/usePolling';
import { StatCard } from '@/components/ui/StatCard';

function formatNGN(amount: number) {
  return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export default function PaymentsPage() {
  const stats = usePolling(diakite.getPaymentStats, 20000);
  const revenue = usePolling(() => diakite.getRevenueAnalytics('month'), 60000);
  const p = stats.data;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <div className="page-sub">Paystack + Flutterwave · NGN</div>
      </div>

      {stats.error && <div className="error-banner">Could not reach Diakite backend: {stats.error}</div>}

      <div className="grid grid-4">
        <StatCard label="Total Revenue" value={p ? formatNGN(p.totalRevenue) : '—'} />
        <StatCard label="Today's Revenue" value={p ? formatNGN(p.todayRevenue) : '—'} />
        <StatCard label="Pending Payments" value={p ? p.pendingCount : '—'} />
        <StatCard label="Total Refunded" value={p ? formatNGN(p.refundedTotal) : '—'} />
      </div>

      <div className="section-title">By Payment Method</div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Method</th><th>Count</th><th>Total</th></tr>
          </thead>
          <tbody>
            {p?.byMethod.map((m) => (
              <tr key={m.method}>
                <td>{m.method}</td>
                <td>{m.count}</td>
                <td>{formatNGN(m.total)}</td>
              </tr>
            ))}
            {!p && !stats.error && <tr><td colSpan={3} style={{ color: 'var(--muted)' }}>Loading…</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="section-title">Commission (Month to Date)</div>
      <div className="grid grid-3">
        <StatCard label="Total Revenue" value={revenue.data ? formatNGN(revenue.data.totalRevenue) : '—'} />
        <StatCard label="Platform Fee" value={revenue.data ? formatNGN(revenue.data.platformFee) : '—'} />
        <StatCard label="Net to Earners" value={revenue.data ? formatNGN(revenue.data.netRevenue) : '—'} />
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 24 }}>
        Note: this reflects payments already recorded in Diakite&apos;s DB. It does not yet catch
        webhook deliveries that failed silently before reaching the Payment table — add a
        WebhookEvent log on the backend (see the payments/webhook handlers) to close that gap.
      </p>
    </div>
  );
}
