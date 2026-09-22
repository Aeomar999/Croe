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
    sheet: 'rounded-r-4 border border-line-primary/80 bg-surface p-5 shadow-elev sm:p-6',
    'sheet-2': 'rounded-r-2 border border-line-primary/70 bg-surface p-4',
  };

  return (
    <div className={cn(paddingStyles[padding], className)}>
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
    <div className={cn('mb-5 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3', className)}>
      <div>
        <h3 className="text-heading font-bold text-ink-primary">{title}</h3>
        {subtitle && <p className="text-caption text-ink-tertiary mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
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
