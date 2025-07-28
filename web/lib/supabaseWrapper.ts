import { supabase } from './supabase';
import { getSafeCategory, getSafeStatus } from './safeCategory';

// Wrapper for trend submissions that GUARANTEES safe values
export async function submitTrend(data: any) {
  console.log('[submitTrend] Raw input:', data);
  
  // Create safe data with ONLY valid values
  const safeData = {
    spotter_id: data.spotter_id,
    description: data.description || 'Untitled Trend',
    evidence: data.evidence || {},
    virality_prediction: data.virality_prediction || 5,
    quality_score: data.quality_score || 0.5,
    validation_count: data.validation_count || 0,
    // CRITICAL: Always use safe functions
    category: getSafeCategory(data.category),
    status: getSafeStatus(data.status || 'submitted')
  };
  
  // Add optional fields if they exist
  if (data.screenshot_url) safeData.screenshot_url = data.screenshot_url;
  if (data.creator_handle) safeData.creator_handle = data.creator_handle;
  if (data.creator_name) safeData.creator_name = data.creator_name;
  if (data.post_caption) safeData.post_caption = data.post_caption;
  if (data.likes_count !== undefined) safeData.likes_count = data.likes_count;
  if (data.comments_count !== undefined) safeData.comments_count = data.comments_count;
  if (data.shares_count !== undefined) safeData.shares_count = data.shares_count;
  if (data.views_count !== undefined) safeData.views_count = data.views_count;
  if (data.hashtags) safeData.hashtags = data.hashtags;
  if (data.post_url) safeData.post_url = data.post_url;
  if (data.thumbnail_url) safeData.thumbnail_url = data.thumbnail_url;
  if (data.posted_at) safeData.posted_at = data.posted_at;
  
  console.log('[submitTrend] Safe data:', safeData);
  console.log('[submitTrend] Category is:', safeData.category);
  console.log('[submitTrend] Status is:', safeData.status);
  
  // FINAL CHECK - This should NEVER happen
  if (safeData.category === 'Humor & Memes' || safeData.category.includes('&')) {
    console.error('[submitTrend] CRITICAL ERROR: Display category detected!');
    safeData.category = 'meme_format';
  }
  
  return supabase
    .from('trend_submissions')
    .insert(safeData);
}