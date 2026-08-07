'use client';

import { useState } from 'react';
import { diakite } from '@/lib/diakiteClient';
import { usePolling } from '@/lib/usePolling';

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const logs = usePolling(() => diakite.getActivityLogs(page, 50), 20000);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <div className="page-sub">backed by ActivityLog · auto-refresh 20s</div>
      </div>

      {logs.error && <div className="error-banner">Could not reach Diakite backend: {logs.error}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.data?.logs.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.createdAt).toLocaleString()}</td>
                <td>{entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : entry.userId ?? 'system'}</td>
                <td>{entry.action}</td>
                <td>{entry.entityType}{entry.entityId ? ` #${entry.entityId.slice(0, 8)}` : ''}</td>
                <td>{entry.ipAddress ?? '—'}</td>
              </tr>
            ))}
            {!logs.data && !logs.error && (
              <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {logs.data && (
        <div style={{ display: 'flex', gap: 10, marginTop: 14, fontFamily: 'var(--mono)', fontSize: 12.5 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={navBtnStyle}
          >
            ← Prev
          </button>
          <span style={{ color: 'var(--muted)' }}>
            page {logs.data.pagination.page} / {logs.data.pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= logs.data!.pagination.pages}
            style={navBtnStyle}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: 6,
  padding: '6px 10px',
  cursor: 'pointer',
};
