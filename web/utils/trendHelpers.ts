// Utility functions for trend data handling

export function getTrendThumbnailUrl(trend: any): string | null {
  // Check for thumbnail first, then screenshot
  if (trend.thumbnail_url && trend.thumbnail_url !== '0') {
    return trend.thumbnail_url;
  }
  if (trend.screenshot_url && trend.screenshot_url !== '0') {
    return trend.screenshot_url;
  }
  return null;
}

export function getTrendTitle(trend: any): string {
  // Check for trend_name first, then description, then evidence title
  if (trend.trend_name && trend.trend_name !== '0') {
    return trend.trend_name;
  }
  if (trend.description && trend.description !== '0') {
    return trend.description;
  }
  if (trend.evidence?.title && trend.evidence.title !== '0') {
    return trend.evidence.title;
  }
  return 'Untitled Trend';
}

export function formatEngagement(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}