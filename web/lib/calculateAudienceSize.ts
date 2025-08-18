/**
 * Calculate potential audience size based on trend size selection
 */
export function calculateAudienceSize(trendSize: string): string {
  switch (trendSize) {
    case 'micro':
      return '100-500';
    case 'niche':
      return '1K-10K';
    case 'viral':
      return '100K-500K';
    case 'mega':
      return '1M-10M';
    case 'global':
      return '10M+';
    default:
      return '0';
  }
}

/**
 * Get numeric audience size for calculations
 */
export function getNumericAudienceSize(trendSize: string): number {
  switch (trendSize) {
    case 'micro':
      return 250;
    case 'niche':
      return 5000;
    case 'viral':
      return 250000;
    case 'mega':
      return 5000000;
    case 'global':
      return 10000000;
    default:
      return 0;
  }
}

/**
 * Format audience size for display
 */
export function formatAudienceSize(size: number): string {
  if (size >= 1000000) {
    return `${(size / 1000000).toFixed(1)}M`;
  } else if (size >= 1000) {
    return `${(size / 1000).toFixed(0)}K`;
  }
  return size.toString();
}