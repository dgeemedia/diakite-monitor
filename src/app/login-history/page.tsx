'use client';

import { usePolling } from '@/lib/usePolling';
import { StatusBadge } from '@/components/ui/StatCard';

interface LoginLogEntry {
  id: string;
  email: string;
  userId: string | null;
  success: boolean;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

async function fetchLoginHistory(): Promise<LoginLogEntry[]> {
  const res = await fetch('/api/login-history', { cache: 'no-store' });
  const json = await res.json();
  return json.data.logs;
}

export default function LoginHistoryPage() {
  const history = usePolling(fetchLoginHistory, 30000);

  const failuresByEmail = new Map<string, number>();
  for (const entry of history.data ?? []) {
    if (!entry.success) {
      failuresByEmail.set(entry.email, (failuresByEmail.get(entry.email) ?? 0) + 1);
    }
  }
  const suspiciousEmails = [...failuresByEmail.entries()].filter(([, count]) => count >= 3);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Login History</h1>
        <div className="page-sub">this dashboard&apos;s own access log · last 200 attempts</div>
      </div>

      {history.error && <div className="error-banner">{history.error}</div>}

      {suspiciousEmails.length > 0 && (
        <div className="error-banner" style={{ background: 'var(--warn-dim)', borderColor: 'var(--warn)', color: 'var(--warn)' }}>
          {suspiciousEmails.map(([email, count]) => `${email}: ${count} failed attempts`).join(' · ')} — within the last 200 logged attempts.
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Result</th>
              <th>When</th>
              <th>Email</th>
              <th>IP</th>
              <th>User Agent</th>
            </tr>
          </thead>
          <tbody>
            {history.data?.map((entry) => (
              <tr key={entry.id}>
                <td><StatusBadge status={entry.success ? 'ok' : 'crit'} /></td>
                <td>{new Date(entry.createdAt).toLocaleString()}</td>
                <td>{entry.email}</td>
                <td>{entry.ip ?? '—'}</td>
                <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.userAgent ?? '—'}
                </td>
              </tr>
            ))}
            {history.data?.length === 0 && (
              <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>No login attempts recorded yet.</td></tr>
            )}
            {!history.data && !history.error && (
              <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
