'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Search,
  Bell,
  Settings,
  ChevronDown,
  LogOut,
  Menu
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { AdminRole } from '@/types';
import { Logo } from '@/components/brand';

const navigation: Array<{ name: string; href: string; roles: AdminRole[] }> = [
  { name: 'Dashboard', href: '/dashboard', roles: ['reviewer', 'ops', 'admin'] },
  { name: 'Pipeline', href: '/pipeline', roles: ['reviewer', 'ops', 'admin'] },
  { name: 'Cases', href: '/disputes/queue', roles: ['reviewer', 'ops', 'admin'] },
  { name: 'Payers', href: '/kyc', roles: ['ops', 'admin'] },
  { name: 'Documents', href: '/documents', roles: ['ops', 'admin'] },
  { name: 'Denials', href: '/reconciliation', roles: ['ops', 'admin'] },
  { name: 'Analytics', href: '/metrics', roles: ['admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();

  const allowedNav = navigation.filter((item) => item.roles.some((r) => hasRole([r])));

  const navLinks = () => allowedNav.map((item) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          'px-4 py-2 rounded-full text-[14px] font-semibold transition-all duration-200',
          isActive
            ? 'bg-ink-primary text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-black/5'
        )}
      >
        {item.name}
      </Link>
    );
  });

  return (
    <div className="w-full px-6 py-5 flex items-center justify-between">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center justify-center w-11 h-11 bg-ink-primary text-white rounded-full shadow-sm hover:scale-105 transition-transform">
          <Logo size={24} style={{ color: 'white' }} />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center bg-white rounded-full p-1.5 shadow-sm border border-black/[0.04]">
          {navLinks()}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex relative items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-ink-tertiary" />
          <input 
            type="text" 
            placeholder="Search cases, patients, payers" 
            className="pl-10 pr-4 py-2.5 rounded-full bg-white border border-black/[0.04] shadow-sm text-[14px] font-medium w-[280px] focus:outline-none focus:ring-2 focus:ring-ink-primary/20 placeholder:text-ink-tertiary transition-all"
          />
        </div>

        {/* Icons */}
        <button className="flex items-center justify-center w-11 h-11 bg-white border border-black/[0.04] rounded-full shadow-sm text-ink-secondary hover:text-ink-primary hover:bg-black/5 transition-all hover:-translate-y-px">
          <Bell className="w-5 h-5" />
        </button>
        <button className="flex items-center justify-center w-11 h-11 bg-white border border-black/[0.04] rounded-full shadow-sm text-ink-secondary hover:text-ink-primary hover:bg-black/5 transition-all hover:-translate-y-px">
          <Settings className="w-5 h-5" />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-2 bg-white border border-black/[0.04] rounded-full shadow-sm p-1.5 pr-4 cursor-pointer hover:bg-black/[0.02] transition-colors" onClick={logout}>
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <span className="text-[14px] font-semibold text-ink-primary ml-1">{user?.name?.split(' ')[0] || 'Sarah'}</span>
          <ChevronDown className="w-4 h-4 text-ink-tertiary ml-1" />
        </div>
      </div>
    </div>
  );
}
