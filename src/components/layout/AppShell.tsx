// src/components/layout/AppShell.tsx
'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="shell">
      <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
        ☰
      </button>

      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="main">{children}</main>
    </div>
  );
}