'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Inbox' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/settings', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <>
      {/* Desktop: left rail */}
      <nav className="hidden md:flex flex-col w-56 shrink-0 border-r border-border px-4 py-6 gap-1">
        <div className="font-display text-xl text-text mb-8 px-2">Huntboard</div>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                active ? 'bg-surface text-accent' : 'text-muted hover:text-text hover:bg-surface'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: bottom tab bar, big tap targets */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-border flex">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 text-center py-4 text-sm ${
                active ? 'text-accent' : 'text-muted'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
