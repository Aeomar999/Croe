'use client';

import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { Squiggles } from '@/components/brand';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  isSplashScreen?: boolean;
}

export function AdminLayout({ children, title, subtitle, headerAction, isSplashScreen = false }: AdminLayoutProps) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EBEAE5] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-ink-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#EBEAE5] flex flex-col relative font-sans text-ink-primary">
      <Squiggles isSplashScreen={isSplashScreen} />
      
      <div className="relative z-10 w-full max-w-[1500px] mx-auto flex-1 flex flex-col">
        <Sidebar />
        
        <div className="px-6 lg:px-10 pb-12 flex-1 flex flex-col">
          <header className="py-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              {subtitle && <p className="text-[13px] font-medium text-ink-tertiary mb-1.5">{subtitle}</p>}
              <h1 className="text-[32px] lg:text-[40px] leading-tight font-medium tracking-tight text-ink-primary">{title}</h1>
              {/* Optional sub-info like "42 active cases • Monday, Sep 21" should be passed via children or handled in the page */}
            </div>
            {headerAction && <div className="w-full lg:w-auto lg:flex-shrink-0">{headerAction}</div>}
          </header>
          
          <main className="flex-1 mt-2">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
