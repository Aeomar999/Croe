'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Gavel,
  Users,
  FileText,
  Calculator,
  Settings,
  Activity,
  Shield,
  LogOut,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { AdminRole } from '@/types';
import { Logo } from '@/components/brand';

const navigation: Array<{ name: string; href: string; icon: React.ElementType; roles: AdminRole[] }> = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['reviewer', 'ops', 'admin'] },
  { name: 'Disputes', href: '/disputes/queue', icon: Gavel, roles: ['reviewer', 'ops', 'admin'] },
  { name: 'Users', href: '/users', icon: Users, roles: ['ops', 'admin'] },
  { name: 'KYC Review', href: '/kyc', icon: FileText, roles: ['ops', 'admin'] },
  { name: 'Reconciliation', href: '/reconciliation', icon: Calculator, roles: ['ops', 'admin'] },
  { name: 'Scheduler', href: '/scheduler', icon: Activity, roles: ['ops', 'admin'] },
  { name: 'Metrics', href: '/metrics', icon: Shield, roles: ['admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();

  const allowedNav = navigation.filter((item) => item.roles.some((r) => hasRole([r])));

  const navLinks = (compact = false) => allowedNav.map((item) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-r-2 font-medium transition-all duration-[160ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-primary/40',
          compact ? 'px-3 py-2.5 text-label' : 'px-3 py-3 text-body',
          isActive
            ? 'bg-state-secure-wash text-state-secure-deep shadow-[inset_3px_0_0_#2563EB]'
            : 'text-ink-secondary hover:bg-sunken hover:text-ink-primary'
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.8} aria-hidden="true" />
        {item.name}
      </Link>
    );
  });

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-line-primary bg-surface lg:flex">
        <div className="flex items-center gap-3 border-b border-line-primary px-5 py-6">
          <Logo size={40} />
          <div>
            <span className="block text-heading font-bold text-ink-primary">Operations</span>
            <span className="text-caption text-ink-tertiary">Reviewer console</span>
          </div>
        </div>
        <nav aria-label="Primary navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navLinks()}
        </nav>
        <div className="border-t border-line-primary p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-r-1 bg-ink-primary text-body font-bold text-on-ink">
              {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium text-ink-primary">{user?.name || user?.email || 'Admin'}</p>
              <p className="text-caption capitalize text-ink-tertiary">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-r-2 px-3 py-2.5 text-body font-medium text-ink-secondary transition-colors hover:bg-sunken hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-primary/40"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <details className="group sticky top-0 z-40 block border-b border-line-primary bg-surface/95 shadow-sm backdrop-blur-md lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 marker:content-none">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="text-label font-semibold text-ink-primary">Operations</span>
          </div>
          <span className="flex items-center gap-2 text-caption font-semibold text-ink-secondary">
            <Menu className="h-4 w-4" aria-hidden="true" />
            Menu
            <ChevronDown className="h-4 w-4 transition-transform duration-[160ms] group-open:rotate-180" aria-hidden="true" />
          </span>
        </summary>
        <div className="border-t border-line-primary px-3 pb-3 pt-2">
          <nav aria-label="Mobile navigation" className="space-y-1">
            {navLinks(true)}
          </nav>
          <button
            onClick={logout}
            className="mt-2 flex w-full items-center gap-3 rounded-r-2 px-3 py-2.5 text-label font-medium text-ink-secondary transition-colors hover:bg-sunken hover:text-ink-primary"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </details>
    </>
  );
}
