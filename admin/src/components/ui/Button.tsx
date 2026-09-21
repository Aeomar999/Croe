'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'wash';
  size?: 'default' | 'sm' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', loading, leftIcon, rightIcon, disabled, children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-sans font-semibold tracking-tight
      rounded-full transition-colors duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.25,1)]
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-primary/50
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variants = {
      primary: 'bg-ink-primary text-on-ink hover:bg-ink-primary/90',
      secondary: 'bg-surface text-ink-primary border border-line-primary hover:bg-surface/80',
      outline: 'bg-transparent text-ink-primary border border-line-primary hover:bg-ink-primary/5',
      ghost: 'bg-transparent text-ink-secondary hover:bg-ink-primary/5',
      danger: 'bg-state-danger-wash text-state-danger-deep hover:bg-state-danger-wash/80',
      wash: 'bg-state-pending-fill text-ink-primary hover:bg-state-pending-fill/80',
    };

    const sizes = {
      sm: 'h-11 px-5 text-label',
      default: 'h-13 px-6 text-body',
      lg: 'h-14 px-8 text-heading',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';