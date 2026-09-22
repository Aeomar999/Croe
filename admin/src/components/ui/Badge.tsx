'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-state-pending-wash text-state-pending-deep',
    success: 'bg-state-secure-wash text-state-secure-deep',
    warning: 'bg-state-caution-wash text-state-caution-deep',
    danger: 'bg-state-danger-wash text-state-danger-deep',
    info: 'bg-state-pending-wash text-ink-primary',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ src, alt, fallback, size = 'md', className }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-caption',
    md: 'w-11 h-11 text-body',
    lg: 'w-16 h-16 text-heading',
  };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center bg-ink-primary text-on-ink font-bold',
        sizes[size],
        className
      )}
      aria-label={alt}
    >
      {src ? (
        <img src={src} alt={alt || ''} className="w-full h-full rounded-full object-cover" />
      ) : (
        fallback || alt?.charAt(0).toUpperCase() || '?'
      )}
    </div>
  );
}

interface SeparatorProps {
  className?: string;
}

export function Separator({ className }: SeparatorProps) {
  return <hr className={cn('h-px bg-line-primary border-none', className)} />;
}