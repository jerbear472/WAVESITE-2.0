// Isolated category mapping to prevent any state issues
export function getSafeCategory(displayCategory: string | undefined | null): string {
  console.log('[getSafeCategory] Input:', displayCategory);
  
  // Always return a valid enum no matter what
  const mapping: Record<string, string> = {
    // Direct mappings from SmartTrendSubmission component IDs
    'meme': 'meme_format',
    'fashion': 'fashion',
    'food': 'food_drink',
    'music': 'audio_music',
    'lifestyle': 'behavior_pattern',
    'tech': 'technology',
    'finance': 'finance',
    'sports': 'sports',
    'political': 'political',
    'cars': 'automotive',
    'animals': 'animals_pets',
    'travel': 'travel',
    'education': 'education',
    'health': 'health',
    
    // Label mappings (what user sees)
    'Meme/Humor': 'meme_format',
    'Fashion/Beauty': 'fashion',
    'Food/Drink': 'food_drink',
    'Music/Dance': 'audio_music',
    'Lifestyle': 'behavior_pattern',
    'Tech/Gaming': 'technology',
    'Finance/Crypto': 'finance',
    'Sports/Fitness': 'sports',
    'Political/Social': 'political',
    'Cars & Machines': 'automotive',
    'Animals & Pets': 'animals_pets',
    'Travel & Places': 'travel',
    'Education & Learning': 'education',
    'Health & Wellness': 'health',
    
    // Legacy mappings (for backward compatibility)
    'Fashion & Beauty': 'fashion',
    'Food & Drink': 'food_drink',
    'Humor & Memes': 'meme_format',
    'Politics & Social Issues': 'political',
    'Music & Dance': 'audio_music',
    'Sports & Fitness': 'sports',
    'Tech & Gaming': 'technology',
    'Art & Creativity': 'visual_style',
    'Education & Science': 'education',
    
    // Lowercase versions
    'cars & machines': 'automotive',
    'animals & pets': 'animals_pets',
    'travel & places': 'travel',
    'education & learning': 'education',
    'health & wellness': 'health'
  };
  
  // Try to map the category
  const mapped = displayCategory ? mapping[displayCategory] : null;
  
  // If we got a valid mapping, use it
  if (mapped) {
    console.log('[getSafeCategory] Mapped to:', mapped);
    return mapped;
  }
  
  // Check if it's already a valid enum (updated list from database)
  const validEnums = [
    'visual_style', 'audio_music', 'creator_technique', 'meme_format', 
    'product_brand', 'behavior_pattern', 'political', 'finance', 
    'news_events', 'education', 'relationship', 'animals_pets', 
    'automotive', 'food_drink', 'technology', 'sports', 'dance', 
    'travel', 'fashion', 'gaming', 'health', 'diy_crafts'
  ];
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