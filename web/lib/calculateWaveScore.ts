/**
 * Calculate the Wave Score for a trend submission
 * Wave Score represents the overall quality and potential of a trend
 * Scale: 0-100
 */

interface TrendData {
  // Basic info
  trendName?: string;
  explanation?: string;
  categories?: string[];
  
  // Engagement metrics
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  
  // Content quality
  thumbnail_url?: string;
  screenshot_url?: string;
  hashtags?: string[];
  
  // Creator info
  creator_handle?: string;
  creator_name?: string;
  
  // Platform data
  platform?: string;
  otherPlatforms?: string[];
  
  // Virality indicators
  spreadSpeed?: string;
  ageRanges?: string[];
  viralityScore?: number;
  confidence?: number;
  
  // Additional flags
  brandAdoption?: boolean;
}

export function calculateWaveScore(formData: TrendData): number {
  let score = 0;
  
  // 1. Content Completeness (25 points max)
  if (formData.trendName && formData.trendName.length > 3) score += 5;
  if (formData.explanation && formData.explanation.length > 20) score += 5;
  if (formData.explanation && formData.explanation.length > 50) score += 3;
  if (formData.categories && formData.categories.length > 0) score += 5;
  if (formData.categories && formData.categories.length > 1) score += 2;
  if (formData.thumbnail_url || formData.screenshot_url) score += 5;
  
  // 2. Engagement Metrics (25 points max)
  const views = formData.views_count || 0;
  const likes = formData.likes_count || 0;
  const comments = formData.comments_count || 0;
  
  // Views scoring
  if (views > 0) score += 3;
  if (views > 1000) score += 3;
  if (views > 10000) score += 3;
  if (views > 100000) score += 3;
  if (views > 1000000) score += 3;
  
  // Engagement rate scoring
  if (views > 0) {
    const engagementRate = ((likes + comments) / views) * 100;
    if (engagementRate > 1) score += 2;
    if (engagementRate > 5) score += 3;
    if (engagementRate > 10) score += 5;
  }
  
  // 3. Virality Potential (20 points max)
  if (formData.spreadSpeed) {
    const speedMap: Record<string, number> = {
      'explosive': 10,
      'rapid': 8,
      'steady': 5,
      'slow': 2
    };
    score += speedMap[formData.spreadSpeed] || 0;
  }
  
  // Multi-platform presence
  if (formData.otherPlatforms && formData.otherPlatforms.length > 0) score += 5;
  if (formData.otherPlatforms && formData.otherPlatforms.length > 2) score += 5;
  
  // 4. Content Richness (15 points max)
  if (formData.hashtags && formData.hashtags.length > 0) score += 3;
  if (formData.hashtags && formData.hashtags.length > 3) score += 3;
  if (formData.hashtags && formData.hashtags.length > 5) score += 2;
  
  if (formData.creator_handle || formData.creator_name) score += 4;
  if (formData.brandAdoption) score += 3;
  
  // 5. Audience Reach (15 points max)
  if (formData.ageRanges && formData.ageRanges.length > 0) score += 5;
  if (formData.ageRanges && formData.ageRanges.length > 2) score += 5;
  if (formData.ageRanges && formData.ageRanges.length > 3) score += 5;
  
  // Ensure score is between 0 and 100
  score = Math.min(100, Math.max(0, score));
  
  // Apply a slight curve to make scores more distributed
  // This prevents clustering around 50
  if (score < 30) {
    score = Math.floor(score * 0.8); // Reduce very low scores
  } else if (score > 70) {
    score = Math.floor(70 + (score - 70) * 1.2); // Boost high scores
  }
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Get a descriptive label for the wave score
 */
export function getWaveScoreLabel(score: number): { label: string; color: string; emoji: string } {
  if (score >= 90) return { label: 'Viral Wave', color: 'text-purple-600', emoji: '🌊' };
  if (score >= 75) return { label: 'Rising Tide', color: 'text-blue-600', emoji: '📈' };
  if (score >= 60) return { label: 'Strong Current', color: 'text-green-600', emoji: '💪' };
  if (score >= 45) return { label: 'Building Momentum', color: 'text-yellow-600', emoji: '⚡' };
  if (score >= 30) return { label: 'Early Ripple', color: 'text-orange-600', emoji: '💫' };
  return { label: 'Just Starting', color: 'text-gray-600', emoji: '🌱' };
}

/**
 * Get suggestions to improve the wave score
 */
export function getWaveScoreImprovements(formData: TrendData): string[] {
  const suggestions: string[] = [];
  
  if (!formData.trendName || formData.trendName.length < 5) {
    suggestions.push('Add a clear, descriptive trend name');
  }
  
  if (!formData.explanation || formData.explanation.length < 50) {
    suggestions.push('Provide a detailed explanation of the trend');
  }
  
  if (!formData.thumbnail_url && !formData.screenshot_url) {
    suggestions.push('Add a screenshot or thumbnail for visual proof');
  }
  
  if (!formData.views_count || formData.views_count < 1000) {
    suggestions.push('Include view count data to show reach');
  }
  
  if (!formData.hashtags || formData.hashtags.length < 3) {
    suggestions.push('Add relevant hashtags to show discoverability');
  }
  
  if (!formData.creator_handle && !formData.creator_name) {
    suggestions.push('Include creator information for credibility');
  }
  
  if (!formData.otherPlatforms || formData.otherPlatforms.length === 0) {
    suggestions.push('Show cross-platform presence for wider reach');
  }
  
  if (!formData.ageRanges || formData.ageRanges.length < 2) {
    suggestions.push('Specify target age demographics');
  }
  
  return suggestions.slice(0, 3); // Return top 3 suggestions
}