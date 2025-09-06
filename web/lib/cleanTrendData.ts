/**
 * Clean trend data from database to remove problematic values
 * that cause "0" or "false" to be displayed in the UI
 */
export function cleanTrendData(trend: any): any {
  if (!trend) return trend;
  
  // Create a cleaned copy
  const cleaned = { ...trend };
  
  // List of fields that should never be 0 or "0" or false
  const fieldsToClean = [
    'description',
    'title',
    'post_caption',
    'creator_handle',
    'creator_name',
    'ai_angle',
    'trend_velocity',
    'trend_size',
    'driving_generation',
    'trend_origin',
    'evolution_status',
    'category',
    'platform',
    'status',
    'stage',
    'validation_status',
    'thumbnail_url',
    'screenshot_url',
    'post_url'
  ];
  
  // Clean string fields - convert 0, "0", false to null
  fieldsToClean.forEach(field => {
    if (cleaned[field] === 0 || 
        cleaned[field] === '0' || 
        cleaned[field] === false ||
        cleaned[field] === 'false' ||
        cleaned[field] === '') {
      cleaned[field] = null;
    }
  });
  
  // List of numeric fields that should be null if 0
  const numericFieldsToClean = [
    'wave_score',
    'quality_score',
    'virality_prediction',
    'xp_amount',
    'likes_count',
    'comments_count',
    'views_count', 
    'shares_count',
    'approve_count',
    'reject_count'
  ];
  
  // Convert 0 to null for numeric fields so they don't render
  numericFieldsToClean.forEach(field => {
    if (cleaned[field] === 0) {
      cleaned[field] = null;
    }
  });
  
  // Clean nested evidence object if it exists
  if (cleaned.evidence) {
    cleaned.evidence = cleanTrendData(cleaned.evidence);
  }
  
  // Clean arrays
  if (Array.isArray(cleaned.hashtags)) {
    cleaned.hashtags = cleaned.hashtags.filter((tag: any) => tag && tag !== '0' && tag !== 0);
  }
  
  if (Array.isArray(cleaned.audience_age)) {
    cleaned.audience_age = cleaned.audience_age.filter((age: any) => age && age !== '0' && age !== 0);
  }
  
  return cleaned;
}

/**
 * Clean an array of trends
 */
export function cleanTrendsArray(trends: any[]): any[] {
  if (!Array.isArray(trends)) return trends;
  return trends.map(trend => cleanTrendData(trend));
}