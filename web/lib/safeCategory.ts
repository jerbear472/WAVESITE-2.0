// Isolated category mapping to prevent any state issues
export function getSafeCategory(displayCategory: string | undefined | null): string {
  console.log('[getSafeCategory] Input:', displayCategory);
  
  // Always return a valid enum no matter what
  const mapping: Record<string, string> = {
    'Fashion & Beauty': 'visual_style',
    'Food & Drink': 'behavior_pattern',
    'Humor & Memes': 'meme_format',
    'Lifestyle': 'behavior_pattern',
    'Politics & Social Issues': 'behavior_pattern',
    'Music & Dance': 'audio_music',
    'Sports & Fitness': 'behavior_pattern',
    'Tech & Gaming': 'creator_technique',
    'Art & Creativity': 'visual_style',
    'Education & Science': 'creator_technique',
    // Lowercase versions just in case
    'fashion & beauty': 'visual_style',
    'food & drink': 'behavior_pattern',
    'humor & memes': 'meme_format',
    'lifestyle': 'behavior_pattern',
    'politics & social issues': 'behavior_pattern',
    'music & dance': 'audio_music',
    'sports & fitness': 'behavior_pattern',
    'tech & gaming': 'creator_technique',
    'art & creativity': 'visual_style',
    'education & science': 'creator_technique'
  };
  
  // Try to map the category
  const mapped = displayCategory ? mapping[displayCategory] : null;
  
  // If we got a valid mapping, use it
  if (mapped) {
    console.log('[getSafeCategory] Mapped to:', mapped);
    return mapped;
  }
  
  // Check if it's already a valid enum
  const validEnums = ['visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern'];
  if (displayCategory && validEnums.includes(displayCategory)) {
    console.log('[getSafeCategory] Already valid:', displayCategory);
    return displayCategory;
  }
  
  // Default fallback
  console.log('[getSafeCategory] Fallback to: meme_format');
  return 'meme_format';
}

// Safe status function to ensure we NEVER use 'pending'
export function getSafeStatus(status: string | undefined | null): string {
  // ONLY valid enum values from the RLS policies
  const validStatuses = ['submitted', 'validating', 'approved', 'rejected', 'viral'];
  
  // If status is 'pending', change it to 'submitted'
  if (status === 'pending') {
    console.warn('[getSafeStatus] Changing pending to submitted');
    return 'submitted';
  }
  
  // If it's already valid, use it
  if (status && validStatuses.includes(status)) {
    return status;
  }
  
  // Default to submitted
  return 'submitted';
}

// Test the functions
if (typeof window !== 'undefined') {
  (window as any).testSafeCategory = () => {
    console.log('Testing getSafeCategory...');
    console.log('Humor & Memes:', getSafeCategory('Humor & Memes'));
    console.log('Fashion & Beauty:', getSafeCategory('Fashion & Beauty'));
    console.log('invalid:', getSafeCategory('invalid'));
    console.log('null:', getSafeCategory(null));
    console.log('visual_style:', getSafeCategory('visual_style'));
  };
  
  (window as any).testSafeStatus = () => {
    console.log('Testing getSafeStatus...');
    console.log('pending:', getSafeStatus('pending'));
    console.log('submitted:', getSafeStatus('submitted'));
    console.log('invalid:', getSafeStatus('invalid'));
    console.log('null:', getSafeStatus(null));
  };
}