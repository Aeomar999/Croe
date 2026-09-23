'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface LogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number;
}

export const Logo = forwardRef<HTMLSpanElement, LogoProps>(
  ({ size = 32, className, ...props }, ref) => {
    // Font size scales with the size prop
    const fontSize = size * 0.68; // 22px at 32px container

    return (
      <span
        ref={ref}
        className={cn('inline-flex items-baseline shrink-0', className)}
        style={{ fontSize: `${fontSize}px`, lineHeight: 1, ...props.style }}
        {...props}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', 'Segoe UI Variable Text', 'Segoe UI', -apple-system, system-ui, sans-serif",
            fontWeight: 800,
            fontSize: `${fontSize}px`,
            letterSpacing: '-0.038em',
            color: '#172033',
          }}
        >
          croe
        </span>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', 'Segoe UI Variable Text', 'Segoe UI', -apple-system, system-ui, sans-serif",
            fontWeight: 800,
            fontSize: `${fontSize}px`,
            letterSpacing: '-0.038em',
            color: '#127A45',
            marginLeft: '-0.08em',
          }}
        >
          .
        </span>
      </span>
    );
  }
);

Logo.displayName = 'Logo';
