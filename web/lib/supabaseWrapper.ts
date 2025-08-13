export async function submitTrendWrapper(trendData: any) {
  const cleanedData = {
    spotter_id: trendData.spotter_id,
    description: trendData.description,
    evidence: trendData.evidence,
    virality_prediction: trendData.virality_prediction,
    quality_score: trendData.quality_score,
    validation_count: trendData.validation_count,
    category: trendData.category || 'general',
    status: 'pending',
    // Social media metadata fields with defaults
    screenshot_url: trendData.screenshot_url || null,
    creator_handle: trendData.creator_handle || null,
    creator_name: trendData.creator_name || null,
    post_caption: trendData.post_caption || null,
    likes_count: parseInt(trendData.likes_count) || 0,
    comments_count: parseInt(trendData.comments_count) || 0,
    shares_count: parseInt(trendData.shares_count) || 0,
    views_count: parseInt(trendData.views_count) || 0,
    hashtags: trendData.hashtags || [],
    post_url: trendData.post_url || null,
    thumbnail_url: trendData.thumbnail_url || null,
    posted_at: trendData.posted_at || null
  };
  
  return cleanedData;
}
