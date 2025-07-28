/**
 * Utility functions for consistent formatting across the app
 */

/**
 * Format currency amounts consistently throughout the app
 * @param amount - The dollar amount to format
 * @param showSymbol - Whether to include the $ symbol (default: true)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | null | undefined, showSymbol: boolean = true): string {
  // Handle null/undefined values
  const value = amount ?? 0;
  
  // Use Intl.NumberFormat for proper locale-aware formatting
  if (showSymbol) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } else {
    return value.toFixed(2);
  }
}

/**
 * Format percentage values consistently
 * @param value - The percentage value (0-1 range)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format numbers with commas for large values
 * @param num - The number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format time duration consistently
 * @param minutes - Duration in minutes
 * @returns Formatted time string (MM:SS)
 */
export function formatDuration(minutes: number): string {
  const mins = Math.floor(minutes);
  const secs = Math.floor((minutes - mins) * 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}