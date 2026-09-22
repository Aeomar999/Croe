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
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="min-w-0">
          <h1 className="text-title font-bold text-ink-primary">{title}</h1>
          {subtitle && <p className="text-body text-ink-secondary mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="w-full lg:w-auto lg:flex-shrink-0">{action}</div>}
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
    <main className={cn('min-h-screen bg-canvas lg:ml-64', className)}>{children}</main>
  );
}
