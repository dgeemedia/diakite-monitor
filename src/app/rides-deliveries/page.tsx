'use client';

import { diakite } from '@/lib/diakiteClient';
import { usePolling } from '@/lib/usePolling';
import { StatCard } from '@/components/ui/StatCard';

export default function RidesDeliveriesPage() {
  const perf = usePolling(() => diakite.getPerformanceAnalytics('week'), 30000);
  const m = perf.data?.metrics;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Rides & Deliveries</h1>
        <div className="page-sub">performance · last 7 days</div>
      </div>

      {perf.error && <div className="error-banner">Could not reach Diakite backend: {perf.error}</div>}

      <div className="grid grid-4">
        <StatCard label="Ride Completion Rate" value={m ? `${m.rideCompletionRate}%` : '—'} />
        <StatCard label="Delivery Completion Rate" value={m ? `${m.deliveryCompletionRate}%` : '—'} />
        <StatCard label="Cancellation Rate" value={m ? `${m.cancellationRate}%` : '—'} />
        <StatCard label="Avg Ride Time" value={m?.averageRideTime != null ? `${m.averageRideTime} min` : '—'} />
      </div>

      <div className="section-title">Ratings</div>
      <div className="grid grid-2">
        <StatCard label="Avg Driver Rating" value={m?.driverRating != null ? `${m.driverRating} ★` : '—'} />
        <StatCard label="Avg Partner Rating" value={m?.partnerRating != null ? `${m.partnerRating} ★` : '—'} />
      </div>

      <div className="section-title">Weekly Activity</div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Day</th><th>Rides</th><th>Deliveries</th></tr>
          </thead>
          <tbody>
            {perf.data?.weeklyActivity.map((row) => (
              <tr key={row.day}>
                <td>{row.day}</td>
                <td>{row.rides}</td>
                <td>{row.deliveries}</td>
              </tr>
            ))}
            {!perf.data && !perf.error && <tr><td colSpan={3} style={{ color: 'var(--muted)' }}>Loading…</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
