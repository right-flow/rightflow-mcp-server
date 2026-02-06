/**
 * Onboarding Helper Functions
 * TDD Implementation - Functions implemented to pass tests
 * Date: 2026-02-06
 */

/**
 * Calculate number of days since a given date
 * @param dateString - ISO date string
 * @returns Number of days elapsed
 */
export function calculateDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate quota usage percentage
 * @param used - Number of items used
 * @param max - Maximum allowed items
 * @returns Percentage (0-100+)
 */
export function getQuotaPercentage(used: number, max: number): number {
  if (max === 0) return 0;
  return Math.floor((used / max) * 100);
}

/**
 * Determine if quota warning should be shown (80%+ usage)
 * @param percentage - Current usage percentage
 * @returns True if warning should be shown
 */
export function shouldShowQuotaWarning(percentage: number): boolean {
  return percentage >= 80;
}

/**
 * Determine if user qualifies as a power user
 * @param formCount - Number of forms created
 * @param responseCount - Number of responses received
 * @returns True if user is a power user (5+ forms OR 40+ responses)
 */
export function isPowerUser(formCount: number, responseCount: number): boolean {
  return formCount >= 5 || responseCount >= 40;
}

/**
 * Determine if hybrid upgrade prompt should be shown
 * @param daysSinceSignup - Days since user signed up
 * @param formCount - Number of forms created
 * @param responseCount - Number of responses received
 * @returns True if prompt should be shown (14+ days AND 3+ forms OR 20+ responses)
 */
export function shouldShowHybridPrompt(
  daysSinceSignup: number,
  formCount: number,
  responseCount: number
): boolean {
  const hasEnoughTime = daysSinceSignup >= 14;
  const hasEnoughEngagement = formCount >= 3 || responseCount >= 20;
  return hasEnoughTime && hasEnoughEngagement;
}

/**
 * Analytics event names for onboarding tracking
 */
export const onboardingEvents = {
  TEMPLATE_SELECTED: 'onboarding_template_selected',
  FIRST_FORM_CREATED: 'onboarding_first_form_created',
  FIRST_RESPONSE_RECEIVED: 'onboarding_first_response_received',
  CHECKLIST_ITEM_COMPLETED: 'onboarding_checklist_completed',
  UPGRADE_PROMPT_SHOWN: 'upgrade_prompt_shown',
  UPGRADE_CLICKED: 'upgrade_clicked',
  HELP_OPENED: 'help_opened',
} as const;
