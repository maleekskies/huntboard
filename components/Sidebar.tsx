'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox as InboxIcon, Kanban, FileText, Settings as SettingsIcon } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Inbox', icon: InboxIcon },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/kit-studio', label: 'Kit Studio', icon: FileText },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
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

      {/* Mobile: floating pill nav, icons with a gradient badge on the active item */}
      <nav className="md:hidden fixed bottom-4 inset-x-4 z-20 bg-surface/95 backdrop-blur border border-border rounded-2xl shadow-lg flex px-1 py-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-colors"
            >
              <span
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${
                  active ? 'grad-bg scale-105' : 'scale-100'
                }`}
              >
                <Icon size={18} className={active ? 'text-bg' : 'text-muted'} strokeWidth={2} />
              </span>
              <span className={`text-[11px] transition-colors ${active ? 'text-text font-medium' : 'text-muted'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
