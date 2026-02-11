/**
 * StatsCard Component
 * Reusable stats card with icon, value, label, and trend indicator
 * Based on Dashboard1.html mockup design
 */

import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { cn } from '@/lib/utils';

export interface StatsCardProps {
  /** Material Symbol icon name */
  icon: string;
  /** Icon background color variant */
  iconColor?: 'blue' | 'orange' | 'green' | 'purple' | 'red' | 'gray';
  /** Main label text */
  label: string;
  /** Main value (number or string) */
  value: string | number;
  /** Trend indicator */
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
  /** Optional click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const iconColorClasses = {
  blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  gray: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
};

export function StatsCard({
  icon,
  iconColor = 'blue',
  label,
  value,
  trend,
  onClick,
  className,
}: StatsCardProps) {
  const CardWrapper = onClick ? 'button' : 'div';

  return (
    <CardWrapper
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30',
        className
      )}
    >
      <div className="flex justify-between items-start mb-4">
        {/* Icon */}
        <div className={cn('p-2 rounded-lg', iconColorClasses[iconColor])}>
          <MaterialIcon name={icon} size="lg" />
        </div>

        {/* Trend Indicator */}
        {trend && (
          <span
            className={cn(
              'text-sm font-bold flex items-center gap-1',
              trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
            )}
          >
            <MaterialIcon
              name={trend.direction === 'up' ? 'trending_up' : 'trending_down'}
              size="xs"
            />
            {trend.percentage}%
          </span>
        )}
      </div>

      {/* Label */}
      <p className="text-muted-foreground text-sm font-medium">{label}</p>

      {/* Value */}
      <h3 className="text-3xl font-bold mt-1 text-foreground">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </h3>
    </CardWrapper>
  );
}

/**
 * Stats Grid - wrapper for multiple StatsCards
 */
export function StatsGrid({
  children,
  columns = 3,
  className,
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-6', gridClasses[columns], className)}>
      {children}
    </div>
  );
}

export default StatsCard;
