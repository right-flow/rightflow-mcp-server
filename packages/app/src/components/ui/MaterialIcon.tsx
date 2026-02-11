/**
 * MaterialIcon Component
 * Wrapper for Google Material Symbols Outlined icons
 * @see https://fonts.google.com/icons?icon.set=Material+Symbols
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface MaterialIconProps {
  /** Material Symbol icon name (e.g., 'dashboard', 'settings', 'add') */
  name: string;
  /** Additional CSS classes */
  className?: string;
  /** Use filled variant of the icon */
  filled?: boolean;
  /** Icon size preset */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Icon weight (100-700) */
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  /** Optical size (20, 24, 40, 48) */
  opticalSize?: 20 | 24 | 40 | 48;
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
  /** Title for accessibility */
  title?: string;
  /** aria-label for accessibility */
  'aria-label'?: string;
  /** aria-hidden for decorative icons */
  'aria-hidden'?: boolean;
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
  '2xl': 'text-4xl',
} as const;

export function MaterialIcon({
  name,
  className,
  filled = false,
  size = 'md',
  weight = 400,
  opticalSize = 24,
  onClick,
  title,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
}: MaterialIconProps) {
  const fontVariationSettings = `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${opticalSize}`;

  return (
    <span
      className={cn(
        'material-symbols-outlined',
        'select-none',
        sizeClasses[size],
        onClick && 'cursor-pointer',
        className
      )}
      style={{ fontVariationSettings }}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden ?? (!ariaLabel && !title)}
      role={ariaLabel || title ? 'img' : undefined}
    >
      {name}
    </span>
  );
}

// Helper component for common icon patterns
export function IconButton({
  icon,
  onClick,
  className,
  title,
  disabled,
  variant = 'ghost',
}: {
  icon: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  title?: string;
  disabled?: boolean;
  variant?: 'ghost' | 'outline' | 'solid';
}) {
  const variantClasses = {
    ghost: 'hover:bg-muted',
    outline: 'border border-border hover:bg-muted',
    solid: 'bg-primary text-primary-foreground hover:bg-primary/90',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 rounded-lg transition-colors',
        variantClasses[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <MaterialIcon name={icon} size="sm" aria-hidden />
    </button>
  );
}

export default MaterialIcon;
