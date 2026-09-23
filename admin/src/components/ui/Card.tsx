'use client';

import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sheet' | 'sheet-2';
}

export function Card({ children, className, padding = 'sheet' }: CardProps) {
  const paddingStyles = {
    none: '',
    sheet: 'rounded-r-4 border border-line-primary/40 bg-surface/95 backdrop-blur-sm p-6 shadow-elev sm:p-8 relative overflow-hidden',
    'sheet-2': 'rounded-r-3 border border-line-primary/30 bg-surface p-5 shadow-sm',
  };

  return (
    <div className={cn('transition-all duration-300 ease-out', paddingStyles[padding], className)}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="space-y-1">
        <h3 className="text-title font-bold text-ink-primary tracking-tight">{title}</h3>
        {subtitle && <p className="text-body text-ink-secondary">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn(className)}>{children}</div>;
}
