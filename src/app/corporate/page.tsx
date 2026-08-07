'use client';

import { diakite } from '@/lib/diakiteClient';
import { usePolling } from '@/lib/usePolling';

function formatNGN(amount: number) {
  return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export default function CorporatePage() {
  const companies = usePolling(() => diakite.getCompanies(1, 25), 45000);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Corporate</h1>
        <div className="page-sub">company wallets & low-balance flags</div>
      </div>

      {companies.error && <div className="error-banner">Could not reach Diakite backend: {companies.error}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Status</th>
              <th>Balance</th>
              <th>Employees</th>
              <th>Trips</th>
            </tr>
          </thead>
          <tbody>
            {companies.data?.companies.map((c) => {
              const low = c.wallet && c.wallet.balance < c.wallet.lowBalanceThreshold;
              return (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.status}</td>
                  <td style={{ color: low ? 'var(--warn)' : undefined }}>
                    {c.wallet ? formatNGN(c.wallet.balance) : '—'}
                    {low ? ' ⚠ low' : ''}
                  </td>
                  <td>{c._count.employees}</td>
                  <td>{c._count.trips}</td>
                </tr>
              );
            })}
            {!companies.data && !companies.error && (
              <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
