// Currency Formatting Utility
// Created: 2026-02-05
// Purpose: Format prices in agorot (cents) to Israeli currency

/**
 * Format amount in agorot to Israeli New Shekel (ILS) currency string
 * @param amountAgorot - Amount in agorot (100 agorot = 1 ILS)
 * @param currency - Currency code (default: ILS)
 * @param locale - Locale for formatting (default: he-IL for Hebrew/Israel)
 * @returns Formatted currency string (e.g., "₪300.00")
 */
export function formatCurrency(
  amountAgorot: number,
  currency: string = 'ILS',
  locale: string = 'he-IL'
): string {
  // Convert agorot to ILS (divide by 100)
  const amount = amountAgorot / 100;

  // Use Intl.NumberFormat for proper currency formatting
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format amount in agorot to plain number string (without currency symbol)
 * @param amountAgorot - Amount in agorot
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string (e.g., "300.00")
 */
export function formatAmount(amountAgorot: number, decimals: number = 2): string {
  const amount = amountAgorot / 100;
  return amount.toFixed(decimals);
}

/**
 * Parse currency string back to agorot
 * @param currencyString - Formatted currency string
 * @returns Amount in agorot
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols and commas
  const cleanString = currencyString.replace(/[₪$€£,\s]/g, '');

  // Parse as float and convert to agorot
  const amount = parseFloat(cleanString);

  if (isNaN(amount)) {
    return 0;
  }

  return Math.round(amount * 100);
}

/**
 * Format price with monthly/yearly options
 * @param priceMonthly - Monthly price in agorot
 * @param priceYearly - Yearly price in agorot (optional)
 * @param isYearly - Whether to show yearly price
 * @returns Formatted price string
 */
export function formatPlanPrice(
  priceMonthly: number,
  priceYearly: number | null,
  isYearly: boolean = false
): string {
  if (priceMonthly === 0) {
    return 'Free';
  }

  if (isYearly && priceYearly !== null) {
    const yearlyFormatted = formatCurrency(priceYearly);
    const monthlyEquivalent = formatCurrency(Math.round(priceYearly / 12));
    return `${yearlyFormatted}/year (${monthlyEquivalent}/mo)`;
  }

  return `${formatCurrency(priceMonthly)}/month`;
}

/**
 * Calculate yearly discount percentage
 * @param priceMonthly - Monthly price in agorot
 * @param priceYearly - Yearly price in agorot
 * @returns Discount percentage (e.g., 20 for 20% off)
 */
export function calculateYearlyDiscount(priceMonthly: number, priceYearly: number): number {
  const yearlyFromMonthly = priceMonthly * 12;
  const discount = ((yearlyFromMonthly - priceYearly) / yearlyFromMonthly) * 100;
  return Math.round(discount);
}
