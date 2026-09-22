'use client';

import { cn } from '@/lib/utils';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {children}
    </div>
  );
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  state?: 'secure' | 'caution' | 'danger' | 'done' | 'pending';
  onClick?: () => void;
}

export function TableRow({ children, className, state, onClick }: TableRowProps) {
  const stateClasses = {
    secure: 's-secure border-l-4 border-l-state-secure-fill',
    caution: 's-caution border-l-4 border-l-state-caution-fill',
    danger: 's-danger border-l-4 border-l-state-danger-fill',
    done: 's-done border-l-4 border-l-ink-primary',
    pending: 's-pending border-l-4 border-l-line-secondary',
  };

  return (
    <div
      className={cn(
        'trow flex-none rounded-r-2 border border-line-primary/80 bg-surface shadow-sm transition-all duration-[160ms]',
        state && stateClasses[state],
        onClick && 'cursor-pointer hover:-translate-y-px hover:border-line-secondary hover:bg-sunken hover:shadow-elev focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-primary/40',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </div>
  );
}

interface TableRowMainProps {
  mark: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  meta?: string;
  className?: string;
}

export function TableRowMain({ mark, title, subtitle, value, meta, className }: TableRowMainProps) {
  return (
    <div className={cn('trow-main flex items-center gap-3 px-3.5 py-3', className)}>
      <div className="tmark flex-none w-10 h-10 rounded-r-1 bg-sunken text-ink-tertiary flex items-center justify-center text-caption font-bold">
        {mark}
      </div>
      <div className="tlead flex-1 min-w-0">
        <p className="ttitle text-subhead font-bold text-ink-primary truncate">{title}</p>
        {subtitle && <p className="tsub text-caption font-medium text-ink-tertiary mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className="tvals flex-none text-right">
        {value && <p className="tval text-body font-bold text-ink-primary tabular-nums">{value}</p>}
        {meta && <p className="tmeta text-[11.5px] font-medium text-ink-tertiary mt-0.5 tabular-nums">{meta}</p>}
      </div>
    </div>
  );
}

interface TableRowRailProps {
  steps: number;
  currentStep: number;
  stateColor?: 'secure' | 'caution' | 'danger' | 'done';
  className?: string;
}

export function TableRowRail({ steps, currentStep, stateColor = 'secure', className }: TableRowRailProps) {
  const stateColors = {
    secure: 'bg-state-secure-fill',
    caution: 'bg-state-caution-fill',
    danger: 'bg-state-danger-fill',
    done: 'bg-ink-primary',
  };

  return (
    <div className={cn('trow-rail flex gap-0.5 h-0.5 flex-none', className)}>
      {Array.from({ length: steps }, (_, i) => (
        <i
          key={i}
          className={cn('flex-1 rounded-full', i < currentStep ? stateColors[stateColor] : 'bg-line-primary')}
        />
      ))}
    </div>
  );
}

interface TableRowFootProps {
  children: React.ReactNode;
  className?: string;
}

export function TableRowFoot({ children, className }: TableRowFootProps) {
  return (
    <div className={cn('trow-foot flex flex-wrap items-center justify-between gap-3 border-t border-line-primary/70 px-3.5 py-2', className)}>
      {children}
    </div>
  );
}

interface TableNoteProps {
  children: React.ReactNode;
  urgent?: boolean;
  className?: string;
}

export function TableNote({ children, urgent, className }: TableNoteProps) {
  return (
    <span className={cn('tnote inline-flex items-center gap-1.5 min-w-0 text-[11.5px] font-medium truncate', urgent ? 'text-state-caution-deep font-semibold' : 'text-ink-tertiary', className)}>
      {children}
    </span>
  );
}
