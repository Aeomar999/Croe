'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Search,
  Bell,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { AdminRole } from '@/types';

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
          'px-5 py-2 rounded-full text-[13px] font-medium transition-colors',
          isActive
            ? 'bg-ink-primary text-white'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-black/5'
        )}
      >
        {item.name}
      </Link>
    );
  });

  return (
    <div className="w-full px-6 lg:px-10 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
      
      {/* Desktop Nav in a single white pill including the logo */}
      <nav className="hidden lg:flex items-center bg-white rounded-full p-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02]">
        <Link href="/dashboard" className="flex items-center justify-center w-10 h-10 bg-ink-primary text-white rounded-full flex-shrink-0 mr-2 ml-0.5 relative">
          <span className="font-bold text-[18px]">C</span>
          <div className="absolute top-[16px] left-[17px] w-1.5 h-1.5 rounded-full bg-[#D8F04B]"></div>
        </Link>
        {navLinks()}
      </nav>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex relative items-center">
          <Search className="absolute left-4 w-4 h-4 text-ink-tertiary" />
          <input 
            type="text" 
            placeholder="Search cases, patients, payers" 
            className="pl-10 pr-4 py-3 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02] text-[13px] font-medium w-[240px] xl:w-[320px] focus:outline-none focus:ring-2 focus:ring-ink-primary/20 placeholder:text-ink-tertiary"
          />
        </div>

        {/* Icons */}
        <button className="flex items-center justify-center w-11 h-11 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02] rounded-full text-ink-primary hover:bg-black/5 transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <button className="flex items-center justify-center w-11 h-11 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02] rounded-full text-ink-primary hover:bg-black/5 transition-colors">
          <Settings className="w-4 h-4" />
        </button>

        {/* Profile Pill */}
        <div className="flex items-center gap-2 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02] rounded-full p-1.5 pr-4 cursor-pointer hover:bg-black/[0.02] transition-colors" onClick={logout}>
          <div className="w-8 h-8 rounded-full bg-[#E88C43] flex items-center justify-center text-white font-bold text-xs overflow-hidden">
             <img src="https://i.pravatar.cc/150?u=sarah" alt="Profile" className="w-full h-full object-cover" />
          </div>
          <span className="text-[13px] font-medium text-ink-primary ml-1">{user?.name?.split(' ')[0] || 'Sarah'}</span>
          <ChevronDown className="w-3.5 h-3.5 text-ink-tertiary ml-1" />
        </div>
      </div>
    </div>
  );
}
