// Isolated category mapping to prevent any state issues
export function getSafeCategory(displayCategory: string | undefined | null): string {
  console.log('[getSafeCategory] Input:', displayCategory);
  
  // Map UI categories to VALID database enum values only
  // Valid enums: meme_format, visual_style, behavior_pattern, audio_music, 
  // creator_technique, product_brand, cultural_reference, platform_mechanic,
  // storytelling_format, editing_technique
  const mapping: Record<string, string> = {
    // Direct mappings from SmartTrendSubmission component IDs
    'meme': 'meme_format',
    'fashion': 'visual_style',  // Fashion is visual
    'food': 'behavior_pattern',  // Food trends are behaviors
    'music': 'audio_music',
    'lifestyle': 'behavior_pattern',
    'tech': 'creator_technique',  // Tech is about creation techniques
    'technology': 'creator_technique',  // Handle both tech and technology
    'finance': 'behavior_pattern',  // Finance trends are behaviors
    'sports': 'behavior_pattern',  // Sports trends are behaviors
    'political': 'cultural_reference',  // Political is cultural
    'cars': 'product_brand',  // Cars are products
    'animals': 'behavior_pattern',  // Animal videos are behaviors
    'travel': 'behavior_pattern',  // Travel trends are behaviors
    'education': 'creator_technique',  // Education is technique
    'health': 'behavior_pattern',  // Health trends are behaviors
    'product': 'product_brand',
    
    // Label mappings (what user sees in the UI)
    'Meme/Humor': 'meme_format',
    'Fashion/Beauty': 'visual_style',
    'Food/Drink': 'behavior_pattern',
    'Music/Dance': 'audio_music',
    'Lifestyle': 'behavior_pattern',
    'Tech/Gaming': 'creator_technique',
    'Finance/Crypto': 'behavior_pattern',
    'Sports/Fitness': 'behavior_pattern',
    'Political/Social': 'cultural_reference',
    'Cars & Machines': 'product_brand',
    'Animals & Pets': 'behavior_pattern',
    'Travel & Places': 'behavior_pattern',
    'Education & Learning': 'creator_technique',
    'Health & Wellness': 'behavior_pattern',
    'Product/Shopping': 'product_brand',
    
    // Legacy mappings (for backward compatibility)
    'Fashion & Beauty': 'visual_style',
    'Food & Drink': 'behavior_pattern',
    'Humor & Memes': 'meme_format',
    'Politics & Social Issues': 'cultural_reference',
    'Music & Dance': 'audio_music',
    'Sports & Fitness': 'behavior_pattern',
    'Tech & Gaming': 'creator_technique',
    'Art & Creativity': 'visual_style',
    'Education & Science': 'creator_technique',
    
    // Lowercase versions (for flexible input handling)
    'cars & machines': 'product_brand',
    'animals & pets': 'behavior_pattern',
    'travel & places': 'behavior_pattern',
    'education & learning': 'creator_technique',
    'health & wellness': 'behavior_pattern'
  };
  
  // Try to map the category
  const mapped = displayCategory ? mapping[displayCategory] : null;
  
  // If we got a valid mapping, use it
  if (mapped) {
    console.log('[getSafeCategory] Mapped to:', mapped);
    return mapped;
  }
  
  // Check if it's already a valid enum (ONLY the actual valid database enums)
  const validEnums = [
    'meme_format', 'visual_style', 'behavior_pattern', 'audio_music',
    'creator_technique', 'product_brand', 'cultural_reference',
    'platform_mechanic', 'storytelling_format', 'editing_technique'
  ];
  if (displayCategory && validEnums.includes(displayCategory)) {
    console.log('[getSafeCategory] Already valid:', displayCategory);
    return displayCategory;
  }
  
  // Default fallback - use behavior_pattern as it's the most general
  console.log('[getSafeCategory] Fallback to: behavior_pattern');
  return 'behavior_pattern';
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