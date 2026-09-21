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
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-sm border-b border-line-primary">
          <div className="max-w-full px-gutter py-4 lg:px-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-title font-bold text-ink-primary">{title}</h1>
              {subtitle && <p className="text-body text-ink-secondary mt-0.5">{subtitle}</p>}
            </div>
            {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
          </div>
        </header>
        <div className="lg:p-8 pt-6 relative z-10">{children}</div>
      </PageContainer>
    </div>
  );
}