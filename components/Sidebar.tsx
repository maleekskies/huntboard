'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Inbox' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/kit-studio', label: 'Kit Studio' },
  { href: '/settings', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <>
      {/* Desktop: left rail, no border box, active item marked by a gradient bar */}
      <nav className="hidden md:flex flex-col w-56 shrink-0 px-4 py-6 gap-1">
        <div className="font-display font-bold text-xl grad-text mb-8 px-2">Huntboard</div>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative px-3 py-2 rounded text-sm transition-colors ${
                active ? 'text-text font-medium' : 'text-muted hover:text-text'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full grad-bar" />
              )}
              <span className={active ? 'pl-3' : ''}>{item.label}</span>
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
                active ? 'text-accent font-medium' : 'text-muted'
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
