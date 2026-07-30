'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Table2,
  Building2,
  Upload,
  Ship,
  CalendarRange,
  Truck,
  TrendingUp,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

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
      { label: 'Vendors', href: '/vendors', icon: Building2 },
      { label: 'Logged Tickets', href: '/tickets', icon: Table2 },
      { label: 'Unapproved', href: '/unapproved', icon: AlertTriangle },
      { label: 'Shipping Costs', href: '/shipping-tracker', icon: Truck },
      { label: 'Forecast', href: '/forecast', icon: TrendingUp },
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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col overflow-hidden print:hidden">
      <div className="h-1 bg-enbridge-yellow shrink-0" />

      <Link
        href="/"
        className="block px-5 py-4 border-b border-[var(--border)] hover:bg-[var(--surface-2)]"
      >
        <div className="text-[13px] font-semibold tracking-tight leading-tight text-[var(--text)]">
          NAEP · Field Cost
        </div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-1">
          Tracker
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <div className="px-2 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
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
                  className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    active
                      ? 'bg-enbridge-black text-white font-semibold'
                      : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
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

      <div className="border-t border-[var(--border)] px-5 py-3 text-[10px] text-[var(--text-muted)]">
        Aitken Creek Expansion
      </div>
    </aside>
  );
}
