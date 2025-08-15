// Validates trend submission payload against known database schema
// This helps prevent submission failures due to field mismatches

export interface ValidatedTrendSubmission {
  // Required fields
  spotter_id: string;
  post_url: string;
  platform: string;
  trend_name: string;
  
  // Optional fields
  description?: string;
  category?: string;
  creator_handle?: string;
  creator_name?: string;
  thumbnail_url?: string;
  screenshot_url?: string;
  
  // Metrics (all optional, defaults to 0 in DB)
  views_count?: number;
  likes_count?: number;
  shares_count?: number;
  comments_count?: number;
  hashtags?: string[];
  
  // Scoring
  virality_prediction?: number; // 1-10
  wave_score?: number;
  quality_score?: number; // 0.00-1.00
  
  // Status
  status?: string;
  
  // Earnings
  base_amount?: number;
  bonus_amount?: number;
  total_earned?: number;
  
  // JSONB field
  follow_up_data?: Record<string, any>;
}

// Valid enum values from database
export const VALID_CATEGORIES = [
  'visual_style', 'audio_music', 'creator_technique', 'meme_format',
  'product_brand', 'behavior_pattern', 'political', 'finance',
  'news_events', 'education', 'relationship', 'animals_pets',
  'automotive', 'food_drink', 'technology', 'sports',
  'dance', 'travel', 'fashion', 'gaming', 'health', 'diy_crafts'
] as const;

export const VALID_STATUSES = [
  'submitted', 'validating', 'approved', 'rejected', 'viral', 'archived'
] as const;

export const VALID_PLATFORMS = [
  'tiktok', 'instagram', 'twitter', 'youtube', 'reddit', 
  'pinterest', 'facebook', 'threads', 'unknown'
] as const;

/**
 * Validates and sanitizes a trend submission payload
 * Removes any fields that don't exist in the database schema
 * Ensures all values meet database constraints
 */
export function validateTrendSubmission(payload: any): ValidatedTrendSubmission {
  const validated: ValidatedTrendSubmission = {
    // Required fields - throw error if missing
    spotter_id: payload.spotter_id,
    post_url: payload.post_url,
    platform: payload.platform,
    trend_name: payload.trend_name || 'Untitled Trend',
  };

  // Validate required fields
  if (!validated.spotter_id) throw new Error('spotter_id is required');
  if (!validated.post_url) throw new Error('post_url is required');
  if (!validated.platform) throw new Error('platform is required');

  // Optional text fields
  if (payload.description) validated.description = String(payload.description);
  if (payload.creator_handle) validated.creator_handle = String(payload.creator_handle);
  if (payload.creator_name) validated.creator_name = String(payload.creator_name);
  if (payload.thumbnail_url) validated.thumbnail_url = String(payload.thumbnail_url);
  if (payload.screenshot_url) validated.screenshot_url = String(payload.screenshot_url);

  // Category validation
  if (payload.category && VALID_CATEGORIES.includes(payload.category)) {
    validated.category = payload.category;
  }

  // Status validation
  if (payload.status && VALID_STATUSES.includes(payload.status)) {
    validated.status = payload.status;
  } else {
    validated.status = 'submitted'; // Default status
  }

  // Numeric fields with validation
  if (payload.views_count && payload.views_count > 0) {
    validated.views_count = parseInt(payload.views_count);
  }
  if (payload.likes_count && payload.likes_count > 0) {
    validated.likes_count = parseInt(payload.likes_count);
  }
  if (payload.shares_count && payload.shares_count > 0) {
    validated.shares_count = parseInt(payload.shares_count);
  }
  if (payload.comments_count && payload.comments_count > 0) {
    validated.comments_count = parseInt(payload.comments_count);
  }

  // Hashtags array
  if (payload.hashtags && Array.isArray(payload.hashtags) && payload.hashtags.length > 0) {
    validated.hashtags = payload.hashtags.map((tag: any) => String(tag));
  }

  // Scoring fields with constraints
  if (payload.virality_prediction) {
    validated.virality_prediction = Math.max(1, Math.min(10, parseInt(payload.virality_prediction)));
  }
  if (payload.wave_score !== undefined) {
    validated.wave_score = parseInt(payload.wave_score);
  }
  if (payload.quality_score !== undefined) {
    validated.quality_score = Math.max(0, Math.min(1, parseFloat(payload.quality_score)));
  }

  // Earnings fields
  if (payload.base_amount !== undefined) {
    validated.base_amount = parseFloat(payload.base_amount);
  }
  if (payload.bonus_amount !== undefined) {
    validated.bonus_amount = parseFloat(payload.bonus_amount);
  }
  if (payload.total_earned !== undefined) {
    validated.total_earned = parseFloat(payload.total_earned);
  }

  // JSONB field
  if (payload.follow_up_data && typeof payload.follow_up_data === 'object') {
    validated.follow_up_data = payload.follow_up_data;
  }

  // Log what fields were included vs excluded for debugging
  const includedFields = Object.keys(validated);
  const excludedFields = Object.keys(payload).filter(key => !includedFields.includes(key));
  
  if (excludedFields.length > 0) {
    console.warn('Fields excluded from submission (not in DB schema):', excludedFields);
  }

  return validated;
}

/**
 * Tests if a submission payload would be valid
 * Returns detailed error information
 */
export function testSubmissionPayload(payload: any): { 
  isValid: boolean; 
  errors: string[]; 
  warnings: string[];
  sanitized: ValidatedTrendSubmission | null;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitized: ValidatedTrendSubmission | null = null;

  try {
    sanitized = validateTrendSubmission(payload);
    
    // Additional validation checks
    if (!VALID_PLATFORMS.includes(payload.platform)) {
      warnings.push(`Platform '${payload.platform}' may not be recognized`);
    }
    
    if (payload.category && !VALID_CATEGORIES.includes(payload.category)) {
      errors.push(`Invalid category: ${payload.category}`);
    }
    
    if (payload.virality_prediction && (payload.virality_prediction < 1 || payload.virality_prediction > 10)) {
      warnings.push(`Virality prediction ${payload.virality_prediction} will be clamped to 1-10 range`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitized
    };
  } catch (error: any) {
    errors.push(error.message);
    return {
      isValid: false,
      errors,
      warnings,
      sanitized: null
    };
  }
}