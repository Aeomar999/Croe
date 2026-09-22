'use client';

import { cn } from '@/lib/utils';

interface PillProps {
  children: React.ReactNode;
  variant?: 'pending' | 'secure' | 'done' | 'caution' | 'danger';
  size?: 'trace' | 'signal' | 'hero';
  className?: string;
  end?: boolean;
  cased?: boolean;
  mine?: boolean;
}

const variantStyles = {
  pending: {
    trace: 'text-ink-secondary',
    signal: 'bg-state-pending-fill text-ink-primary',
    hero: 'bg-state-pending-fill text-ink-primary',
  },
  secure: {
    trace: 'text-state-secure-deep',
    signal: 'bg-state-secure-fill text-state-secure-on',
    hero: 'bg-state-secure-fill text-state-secure-on',
  },
  done: {
    trace: 'text-state-done-deep',
    signal: 'bg-state-done-fill text-state-done-on',
    hero: 'bg-state-done-fill text-state-done-on',
  },
  caution: {
    trace: 'text-state-caution-deep',
    signal: 'bg-state-caution-fill text-state-caution-on',
    hero: 'bg-state-caution-fill text-state-caution-on',
  },
  danger: {
    trace: 'text-state-danger-deep',
    signal: 'bg-state-danger-fill text-state-danger-on',
    hero: 'bg-state-danger-fill text-state-danger-on',
  },
};

const sizeStyles = {
  trace: 'inline-flex items-center gap-1.5 text-caption font-semibold',
  signal: 'inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-caption font-semibold tabular-nums',
  hero: 'inline-flex items-center gap-2 px-4 py-1 rounded-full text-label font-semibold tabular-nums',
};

const casedStyles = {
  trace: 'h-6.5 px-3 pl-2.5 rounded-full bg-surface border border-line-primary',
  signal: '',
  hero: '',
};

export function Pill({ children, variant = 'pending', size = 'trace', className, end, cased, mine }: PillProps) {
  const variantStyle = variantStyles[variant][size];
  const sizeStyle = sizeStyles[size];
  const casedStyle = cased ? casedStyles[size] : '';

  if (size === 'trace') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-caption font-semibold whitespace-nowrap',
          variantStyle,
          end && 'flex-row-reverse',
          casedStyle,
          className
        )}
      >
        <span
          className={cn(
            'flex-none w-2.5 h-2.5 rounded-full',
            mine ? 'bg-transparent border border-current' : 'bg-current'
          )}
        />
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        sizeStyle,
        variantStyle,
        casedStyle,
        className
      )}
    >
      {children}
    </span>
  );
}