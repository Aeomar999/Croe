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
    sheet: 'p-5 rounded-r-4 bg-surface',
    'sheet-2': 'p-4 rounded-r-2 bg-surface',
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
    <div className={cn('flex items-baseline justify-between gap-3 mb-4', className)}>
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