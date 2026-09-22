'use client';

import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { PageContainer } from './Header';
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
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-ink-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-canvas relative">
      <Squiggles isSplashScreen={isSplashScreen} />
      <Sidebar />
      <PageContainer>
        <header className="sticky top-[65px] lg:top-0 z-30 border-b border-line-primary bg-surface/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="min-w-0">
              <h1 className="text-title font-bold text-ink-primary">{title}</h1>
              {subtitle && <p className="text-body text-ink-secondary mt-0.5">{subtitle}</p>}
            </div>
            {headerAction && <div className="w-full lg:w-auto lg:flex-shrink-0">{headerAction}</div>}
          </div>
        </header>
        <div className="relative z-10 mx-auto max-w-[1600px] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</div>
      </PageContainer>
    </div>
  );
}
