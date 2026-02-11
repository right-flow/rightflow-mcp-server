/**
 * TierBadge Component
 * Displays user tier with appropriate icon and styling
 */

import { UserTier } from '@/services/access-control/AccessControl';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Building } from 'lucide-react';

interface TierBadgeProps {
  tier: UserTier;
  size?: 'sm' | 'md' | 'lg';
}

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const config: Record<UserTier, { label: string; icon: typeof Star; className: string }> = {
    [UserTier.GUEST]: {
      label: 'GUEST',
      icon: Star,
      className: 'bg-gray-50 text-gray-500 border-gray-200',
    },
    [UserTier.FREE]: {
      label: 'FREE',
      icon: Star,
      className: 'bg-gray-100 text-gray-700 border-gray-300',
    },
    [UserTier.PRO]: {
      label: 'PRO',
      icon: Crown,
      className: 'bg-blue-100 text-blue-700 border-blue-300',
    },
    [UserTier.ENTERPRISE]: {
      label: 'ENTERPRISE',
      icon: Building,
      className: 'bg-purple-100 text-purple-700 border-purple-300',
    },
  };

  // Size configurations
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-2',
    md: 'text-sm py-1 px-3',
    lg: 'text-base py-1.5 px-4',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const { label, icon: Icon, className } = config[tier] || config[UserTier.FREE];

  return (
    <Badge
      variant="outline"
      className={`${className} ${sizeClasses[size]} flex items-center gap-1.5`}
    >
      <Icon className={iconSizes[size]} />
      <span>{label}</span>
    </Badge>
  );
}
