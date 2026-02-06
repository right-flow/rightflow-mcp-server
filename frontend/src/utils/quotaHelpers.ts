// Quota Helper Utilities
// Created: 2026-02-05
// Purpose: Helper functions for quota calculations and status determination

/**
 * Color codes for quota status visualization
 */
export type QuotaColor = 'green' | 'yellow' | 'red';

/**
 * Quota status labels
 */
export type QuotaStatusLabel = 'Healthy' | 'Moderate' | 'High' | 'Critical' | 'Exceeded';

/**
 * Calculate quota usage percentage
 * @param used - Number of submissions used
 * @param limit - Quota limit
 * @returns Percentage used (0-100, capped at 100 for display)
 */
export function calculateQuotaPercentage(used: number, limit: number): number {
  if (limit === 0) {
    return 0;
  }

  const percentage = (used / limit) * 100;

  // Cap at 100 for display purposes (but calculation can exceed for overage)
  return Math.min(Math.round(percentage), 100);
}

/**
 * Get actual quota percentage (can exceed 100% for overage)
 * @param used - Number of submissions used
 * @param limit - Quota limit
 * @returns Actual percentage (can exceed 100)
 */
export function getActualQuotaPercentage(used: number, limit: number): number {
  if (limit === 0) {
    return 0;
  }

  return Math.round((used / limit) * 100);
}

/**
 * Determine quota color based on percentage used
 * @param percentage - Quota usage percentage
 * @returns Color code (green, yellow, red)
 */
export function getQuotaColor(percentage: number): QuotaColor {
  if (percentage < 70) {
    return 'green'; // Healthy: 0-69%
  } else if (percentage < 90) {
    return 'yellow'; // Warning: 70-89%
  } else {
    return 'red'; // Critical: 90-100%+
  }
}

/**
 * Get user-friendly quota status label
 * @param percentage - Quota usage percentage
 * @param isExceeded - Whether quota is exceeded
 * @returns Status label
 */
export function getQuotaStatus(percentage: number, isExceeded: boolean = false): QuotaStatusLabel {
  if (isExceeded || percentage > 100) {
    return 'Exceeded';
  }

  if (percentage < 50) {
    return 'Healthy';
  } else if (percentage < 70) {
    return 'Moderate';
  } else if (percentage < 90) {
    return 'High';
  } else {
    return 'Critical';
  }
}

/**
 * Get Tailwind CSS class for quota color
 * @param color - Quota color (green, yellow, red)
 * @returns Tailwind CSS class string
 */
export function getQuotaColorClass(color: QuotaColor): string {
  switch (color) {
    case 'green':
      return 'bg-green-500 text-white';
    case 'yellow':
      return 'bg-amber-500 text-gray-900';
    case 'red':
      return 'bg-red-500 text-white';
  }
}

/**
 * Get Tailwind CSS class for quota text color
 * @param color - Quota color (green, yellow, red)
 * @returns Tailwind CSS class string for text
 */
export function getQuotaTextColorClass(color: QuotaColor): string {
  switch (color) {
    case 'green':
      return 'text-green-600';
    case 'yellow':
      return 'text-amber-600';
    case 'red':
      return 'text-red-600';
  }
}

/**
 * Calculate remaining submissions
 * @param used - Submissions used
 * @param limit - Quota limit
 * @returns Remaining submissions (0 if exceeded)
 */
export function calculateRemaining(used: number, limit: number): number {
  const remaining = limit - used;
  return Math.max(remaining, 0);
}

/**
 * Calculate overage amount
 * @param used - Submissions used
 * @param limit - Quota limit
 * @returns Overage amount (0 if not exceeded)
 */
export function calculateOverage(used: number, limit: number): number {
  const overage = used - limit;
  return Math.max(overage, 0);
}

/**
 * Determine if upgrade is recommended
 * @param percentage - Quota usage percentage
 * @param planName - Current plan name
 * @returns Whether upgrade is recommended
 */
export function shouldRecommendUpgrade(percentage: number, planName: string): boolean {
  // FREE plan: recommend upgrade at 80%
  if (planName === 'FREE' && percentage >= 80) {
    return true;
  }

  // Paid plans: recommend upgrade at 90%
  if (planName !== 'FREE' && percentage >= 90) {
    return true;
  }

  return false;
}

/**
 * Format quota display text
 * @param used - Submissions used
 * @param limit - Quota limit
 * @returns Formatted string (e.g., "75 / 100 submissions")
 */
export function formatQuotaDisplay(used: number, limit: number): string {
  return `${used.toLocaleString()} / ${limit.toLocaleString()} submissions`;
}

/**
 * Get warning message for quota status
 * @param percentage - Quota usage percentage
 * @param planName - Current plan name
 * @returns Warning message (empty string if no warning)
 */
export function getQuotaWarningMessage(percentage: number, planName: string): string {
  if (percentage >= 100) {
    if (planName === 'FREE') {
      return 'Quota exceeded. Upgrade to continue submitting forms.';
    }
    return 'Quota exceeded. Additional submissions will incur overage charges.';
  }

  if (percentage >= 90) {
    return `You've used ${percentage}% of your monthly quota. Consider upgrading soon.`;
  }

  if (percentage >= 80) {
    return `You've used ${percentage}% of your monthly quota.`;
  }

  return '';
}
