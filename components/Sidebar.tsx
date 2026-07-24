'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Table2,
  Grid3x3,
  ScrollText,
  Upload,
  Ship,
  CalendarRange,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Cost Control',
    items: [
      { label: 'Logged Tickets', href: '/tickets', icon: Table2 },
      { label: 'Ticket Map', href: '/ticket-map', icon: Grid3x3 },
      { label: 'Purchase Orders', href: '/admin/pos', icon: ScrollText },
    ],
  },
  {
    label: 'Intake',
    items: [{ label: 'Upload & Reconcile', href: '/upload', icon: Upload }],
  },
  {
    label: 'Schedule',
    items: [
      { label: 'Ship Schedule', href: '/schedule', icon: Ship },
      { label: 'EWP Schedule', href: '/ewp-schedule', icon: CalendarRange },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-black/10 flex flex-col overflow-hidden print:hidden">
      <div className="h-1 bg-enbridge-yellow shrink-0" />

      <Link href="/" className="block px-4 py-4 border-b border-black/5 hover:bg-enbridge-paper">
        <div className="font-semibold text-enbridge-black tracking-tight text-[13px] leading-tight">
          Aitken Creek Expansion
        </div>
        <div className="text-[10px] text-enbridge-black/55 mt-0.5">
          Field Cost Tracker
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <div className="px-2 pt-1 pb-1.5 text-[10px] uppercase tracking-widest text-enbridge-black/45 font-semibold">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                    active
                      ? 'bg-enbridge-black text-white font-semibold'
                      : 'text-enbridge-black/75 hover:bg-enbridge-paper hover:text-enbridge-black'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-black/10 px-4 py-3 space-y-2">
        <div className="text-[10px] text-enbridge-black/55 truncate" title={userEmail}>
          {userEmail}
        </div>
        <button
          onClick={signOut}
          className="w-full text-left text-[11px] px-2 py-1 rounded border border-black/15 hover:bg-enbridge-paper text-enbridge-black/70"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
