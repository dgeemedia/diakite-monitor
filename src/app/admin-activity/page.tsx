'use client';

import { useMemo } from 'react';
import { diakite } from '@/lib/diakiteClient';
import { usePolling } from '@/lib/usePolling';
import { classifyAction, describeAction, type RiskTier } from '@/lib/adminRisk';
import { StatCard, StatusBadge } from '@/components/ui/StatCard';
import type { ActivityLogEntry } from '@/types/diakite';

interface FlaggedActivity {
  id: string;
  diakiteLogId: string;
  action: string;
  severity: string;
  actorEmail: string | null;
  actorName: string | null;
  message: string;
  amount: number | null;
  notifiedAt: string;
  occurredAt: string;
}

async function fetchFlags(): Promise<FlaggedActivity[]> {
  const res = await fetch('/api/flagged-activity', { cache: 'no-store' });
  const json = await res.json();
  return json.data.flags;
}

const TIER_BADGE: Record<RiskTier, 'ok' | 'warn' | 'crit'> = {
  critical: 'crit',
  high: 'warn',
  medium: 'warn',
  low: 'ok',
};

export default function AdminActivityPage() {
  const logs = usePolling(() => diakite.getActivityLogs(1, 100), 30000);
  const flags = usePolling(fetchFlags, 20000);

  const entries = logs.data?.logs ?? [];

  const byActor = useMemo(() => {
    const map = new Map<string, { name: string; email: string; total: number; critical: number; high: number }>();
    for (const e of entries) {
      const key = e.userId ?? 'system';
      const name = e.user ? `${e.user.firstName} ${e.user.lastName}` : 'System / unknown';
      const email = e.user?.email ?? '—';
      const tier = classifyAction(e.action);
      const row = map.get(key) ?? { name, email, total: 0, critical: 0, high: 0 };
      row.total += 1;
      if (tier === 'critical') row.critical += 1;
      if (tier === 'high') row.high += 1;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.critical - a.critical || b.total - a.total);
  }, [entries]);

  const highRiskFeed = useMemo(
    () =>
      entries
        .map((e) => ({ entry: e, tier: classifyAction(e.action) }))
        .filter((x): x is { entry: ActivityLogEntry; tier: 'critical' | 'high' } => x.tier === 'critical' || x.tier === 'high')
        .slice(0, 20),
    [entries]
  );

  const criticalCount = highRiskFeed.filter((x) => x.tier === 'critical').length;
  const newAdminAccounts = entries.filter((e) => e.action === 'admin_user_created').length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Activity</h1>
        <div className="page-sub">last 100 actions · auto-refresh 30s</div>
      </div>

      {(logs.error || flags.error) && (
        <div className="error-banner">Could not reach backend: {logs.error ?? flags.error}</div>
      )}

      <div className="grid grid-4">
        <StatCard label="Critical Actions (recent)" value={criticalCount} />
        <StatCard label="New Admin Accounts" value={newAdminAccounts} />
        <StatCard label="Distinct Actors" value={byActor.length} />
        <StatCard label="Flagged & Notified (all-time)" value={flags.data?.length ?? '—'} />
      </div>

      {newAdminAccounts > 0 && (
        <div className="error-banner" style={{ background: 'var(--warn-dim)', borderColor: 'var(--warn)', color: 'var(--warn)' }}>
          {newAdminAccounts} new admin/staff account(s) created in the last 100 logged actions — verify each was expected.
        </div>
      )}

      <div className="section-title">Activity by Admin</div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Admin</th>
              <th>Email</th>
              <th>Total Actions</th>
              <th>Critical</th>
              <th>High</th>
            </tr>
          </thead>
          <tbody>
            {byActor.map((row) => (
              <tr key={row.email}>
                <td>{row.name}</td>
                <td>{row.email}</td>
                <td>{row.total}</td>
                <td style={{ color: row.critical > 0 ? 'var(--crit)' : undefined }}>{row.critical}</td>
                <td style={{ color: row.high > 0 ? 'var(--warn)' : undefined }}>{row.high}</td>
              </tr>
            ))}
            {byActor.length === 0 && !logs.error && (
              <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="section-title">High-Risk Feed (unconfirmed — live from ActivityLog)</div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Risk</th>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {highRiskFeed.map(({ entry, tier }) => (
              <tr key={entry.id}>
                <td><StatusBadge status={TIER_BADGE[tier]} /></td>
                <td>{new Date(entry.createdAt).toLocaleString()}</td>
                <td>{entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : entry.userId ?? 'system'}</td>
                <td>{describeAction(entry.action, entry.details)}</td>
              </tr>
            ))}
            {highRiskFeed.length === 0 && !logs.error && (
              <tr><td colSpan={4} style={{ color: 'var(--muted)' }}>No high-risk actions in the last 100 logged events.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="section-title">Flagged & Notified (confirmed by the evaluator)</div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Occurred</th>
              <th>Actor</th>
              <th>Detail</th>
              <th>Notified</th>
            </tr>
          </thead>
          <tbody>
            {flags.data?.map((f) => (
              <tr key={f.id}>
                <td><StatusBadge status={f.severity === 'critical' ? 'crit' : 'warn'} /></td>
                <td>{new Date(f.occurredAt).toLocaleString()}</td>
                <td>{f.actorName ?? f.actorEmail ?? '—'}</td>
                <td>{f.message}</td>
                <td>{new Date(f.notifiedAt).toLocaleTimeString()}</td>
              </tr>
            ))}
            {flags.data?.length === 0 && (
              <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>None yet — the evaluator flags new critical/high actions every 5 min.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 24 }}>
        This view is only as good as what <code>ActivityLog</code> captures. Two gaps worth closing
        on the backend: failed authorization attempts (403s from <code>authorize()</code>/
        <code>requireScope()</code>) and admin login events currently aren&apos;t written to{' '}
        <code>ActivityLog</code> — see the README for the two small middleware patches that close both.
      </p>
    </div>
  );
}
