interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number | null;
  deltaSuffix?: string;
}

export function StatCard({ label, value, delta, deltaSuffix = '% vs yesterday' }: StatCardProps) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {delta !== undefined && delta !== null && (
        <div className={`stat-delta ${delta >= 0 ? 'delta-up' : 'delta-down'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}
          {deltaSuffix}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: 'ok' | 'warn' | 'crit' }) {
  const label = { ok: 'Healthy', warn: 'Degraded', crit: 'Critical' }[status];
  return (
    <span className={`badge badge-${status}`}>
      <span className={`dot dot-${status}`} /> {label}
    </span>
  );
}
