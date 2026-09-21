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

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-surface border-r border-line-primary flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-line-primary">
        <Logo size={40} />
        <span className="text-heading font-bold text-ink-primary">Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {allowedNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-r-2 text-body font-medium transition-colors duration-[160ms]',
                isActive
                  ? 'bg-ink-primary/5 text-ink-primary'
                  : 'text-ink-secondary hover:bg-ink-primary/5 hover:text-ink-primary'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-line-primary">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-ink-primary flex items-center justify-center text-on-ink font-bold text-body">
            {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body font-medium text-ink-primary truncate">{user?.name || user?.email || 'Admin'}</p>
            <p className="text-caption text-ink-tertiary capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-r-2 text-body font-medium text-ink-secondary hover:bg-ink-primary/5 hover:text-ink-primary transition-colors"
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}