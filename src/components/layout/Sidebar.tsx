'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/payments', label: 'Payments' },
  { href: '/rides-deliveries', label: 'Rides & Deliveries' },
  { href: '/shield', label: 'SHIELD' },
  { href: '/duopay', label: 'DuoPay' },
  { href: '/corporate', label: 'Corporate' },
  { href: '/audit-log', label: 'Audit Log' },
  { href: '/admin-activity', label: 'Admin Activity' },
  { href: '/login-history', label: 'Login History' },
  { href: '/alerts', label: 'Alerts' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/session')
      .then((r) => r.json())
      .then((json) => setUser(json.data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/session', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="brand">Diakite / Monitor</div>
      <nav style={{ flex: 1 }}>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${pathname === link.href ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {user && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--mono)', padding: '0 10px 8px' }}>
            {user.name ?? user.email}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--muted)',
              padding: '7px 10px',
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
