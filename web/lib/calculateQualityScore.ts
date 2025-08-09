/**
 * Calculate quality score for a trend submission
 * Returns a score from 0-10 based on completeness and quality
 */

interface TrendData {
  trendName?: string;
  explanation?: string;
  description?: string;
  categories?: string[];
  platform?: string;
  creator_handle?: string;
  creator_name?: string;
  hashtags?: string[];
  ageRanges?: string[];
  subcultures?: string[];
  region?: string;
  moods?: string[];
  spreadSpeed?: string;
  screenshot?: any;
  screenshot_url?: string;
  thumbnail_url?: string;
  video_url?: string;
  url?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  post_caption?: string;
}

export function calculateQualityScore(data: TrendData): number {
  let score = 0;
  let maxScore = 0;
  
  // 1. Title/Name (1 point)
  if (data.trendName && data.trendName.length >= 3) {
    score += 1;
  }
  maxScore += 1;
  
  // 2. Description/Explanation (2 points)
  const description = data.explanation || data.description || '';
  if (description.length >= 50) {
    score += 1;
    if (description.length >= 200) {
      score += 1; // Bonus for detailed description
    }
  }
  maxScore += 2;
  
  // 3. Category (1 point)
  if (data.categories && data.categories.length > 0) {
    score += 1;
  }
  maxScore += 1;
  
  // 4. Platform (1 point)
  if (data.platform) {
    score += 1;
  }
  maxScore += 1;
  
  // 5. Creator Info (1 point)
  if (data.creator_handle || data.creator_name) {
    score += 1;
  }
  maxScore += 1;
  
  // 6. Media (2 points)
  if (data.screenshot || data.screenshot_url || data.thumbnail_url) {
    score += 1;
  }
  if (data.video_url || (data.platform === 'tiktok' && data.url)) {
    score += 1;
  }
  maxScore += 2;
  
  // 7. Hashtags (0.5 points)
  if (data.hashtags && data.hashtags.length >= 3) {
    score += 0.5;
  }
  maxScore += 0.5;
  
  // 8. Demographics & Context (1.5 points)
  if (data.ageRanges && data.ageRanges.length > 0) {
    score += 0.5;
  }
  if (data.subcultures && data.subcultures.length > 0) {
    score += 0.5;
  }
  if (data.region || data.moods?.length || data.spreadSpeed) {
    score += 0.5;
  }
  maxScore += 1.5;
  
  // 9. Engagement Metrics (1 point)
  const hasEngagement = data.views_count || data.likes_count || 
                        data.comments_count || data.shares_count;
  if (hasEngagement) {
    score += 1;
  }
  maxScore += 1;
  
  // 10. Additional Context (1 point)
  if (data.post_caption && data.post_caption.length > 10) {
    score += 1;
  }
  maxScore += 1;
  
  // Calculate final score (0-10 scale)
  const finalScore = (score / maxScore) * 10;
  
  // Round to 1 decimal place
  return Math.round(finalScore * 10) / 10;
}

/**
 * Get quality score tier and feedback
 */
export function getQualityTier(score: number): {
  tier: 'excellent' | 'good' | 'fair' | 'poor';
  label: string;
  color: string;
  feedback: string;
} {
  if (score >= 8) {
    return {
      tier: 'excellent',
      label: 'Excellent',
      color: 'text-green-600',
      feedback: 'Outstanding submission with comprehensive details!'
    };
  } else if (score >= 6) {
    return {
      tier: 'good',
      label: 'Good',
      color: 'text-blue-600',
      feedback: 'Good submission! Add more details to improve.'
    };
  } else if (score >= 4) {
    return {
      tier: 'fair',
      label: 'Fair',
      color: 'text-yellow-600',
      feedback: 'Basic submission. Add screenshots, descriptions, and context.'
    };
  } else {
    return {
      tier: 'poor',
      label: 'Needs Work',
      color: 'text-red-600',
      feedback: 'Missing key information. Please add more details.'
    };
  }
}

/**
 * Get suggestions for improving quality score
 */
export function getQualityImprovementTips(data: TrendData): string[] {
  const tips: string[] = [];
  
  if (!data.trendName || data.trendName.length < 3) {
    tips.push('Add a clear, descriptive trend name');
  }
  
  const description = data.explanation || data.description || '';
  if (description.length < 50) {
    tips.push('Write a detailed explanation (50+ characters)');
  } else if (description.length < 200) {
    tips.push('Expand your explanation for better context (200+ characters ideal)');
  }
  
  if (!data.screenshot && !data.screenshot_url && !data.thumbnail_url) {
    tips.push('Add a screenshot or image for visual proof');
  }
  
  if (!data.platform) {
    tips.push('Specify which platform this trend is from');
  }
  
  if (!data.creator_handle && !data.creator_name) {
    tips.push('Include the creator\'s handle or name');
  }
  
  if (!data.hashtags || data.hashtags.length < 3) {
    tips.push('Add at least 3 relevant hashtags');
  }
  
  if (!data.ageRanges || data.ageRanges.length === 0) {
    tips.push('Select target age ranges');
  }
  
  if (!data.subcultures || data.subcultures.length === 0) {
    tips.push('Identify relevant subcultures');
  }
  
  const hasEngagement = data.views_count || data.likes_count || 
                        data.comments_count || data.shares_count;
  if (!hasEngagement) {
    tips.push('Add engagement metrics (views, likes, etc.)');
  }
  
  return tips.slice(0, 3); // Return top 3 tips
}