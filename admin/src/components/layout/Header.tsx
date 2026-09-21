'use client';

import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-sm border-b border-line-primary">
      <div className="max-w-full px-gutter py-4 lg:px-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-title font-bold text-ink-primary">{title}</h1>
          {subtitle && <p className="text-body text-ink-secondary mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </header>
  );
}

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main className={cn('lg:ml-64 min-h-screen bg-canvas', className)}>
      <div className="lg:p-8 pt-6">{children}</div>
    </main>
  );
}