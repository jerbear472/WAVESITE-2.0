// Isolated category mapping to prevent any state issues
export function getSafeCategory(displayCategory: string | undefined | null): string {
  console.log('[getSafeCategory] Input:', displayCategory);
  
  // Map UI categories to database enum values
  // These are the ACTUAL enum values from the database trend_category type
  const mapping: Record<string, string> = {
    // Direct mappings from UI to database enums
    'meme': 'meme_format',
    'fashion': 'fashion',
    'food': 'food_drink',
    'music': 'music',
    'tech': 'technology',
    'technology': 'technology',
    'finance': 'finance',
    'sports': 'sports',
    'political': 'political',
    'cars': 'automotive',
    'animals': 'animals_pets',
    'travel': 'travel',
    'education': 'education',
    'science': 'education', // Map science to education
    'entertainment': 'creator_technique', // Map entertainment to creator_technique
    'art': 'visual_style',
    'relationships': 'relationship',
    'health': 'health',
    
    // Label mappings (what user sees in the UI)
    'Meme/Humor': 'meme_format',
    'Fashion/Beauty': 'fashion',
    'Food/Drink': 'food_drink',
    'Music/Dance': 'music',
    'Tech/Gaming': 'gaming',
    'Finance/Crypto': 'finance',
    'Sports/Fitness': 'sports',
    'Political/Social': 'political',
    'Cars & Machines': 'automotive',
    'Animals & Pets': 'animals_pets',
    'Travel & Places': 'travel',
    'Education & Learning': 'education',
    'Science & Tech': 'technology',
    'Entertainment': 'creator_technique',
    'Art & Design': 'visual_style',
    'Relationships': 'relationship',
    'Health & Wellness': 'health',
    
    // Additional mappings for common terms
    'gaming': 'gaming',
    'dance': 'dance',
    'diy': 'diy_crafts',
    'pets': 'animals_pets',
    'auto': 'automotive',
    'crypto': 'finance',
    'fitness': 'health',
    'beauty': 'fashion',
    'humor': 'meme_format',
    'comedy': 'creator_technique',
    'social': 'social_cause',
    'brand': 'brand',
    'product': 'product_brand',
    
    // Lowercase versions (for flexible input handling)
    'cars & machines': 'automotive',
    'animals & pets': 'animals_pets',
    'travel & places': 'travel',
    'education & learning': 'education',
    'health & wellness': 'health'
  };
  
  // Try to map the category
  const mapped = displayCategory ? mapping[displayCategory.toLowerCase()] || mapping[displayCategory] : null;
  
  // If we got a valid mapping, use it
  if (mapped) {
    console.log('[getSafeCategory] Mapped to:', mapped);
    return mapped;
  }
  
  // List of valid database enum values
  const validCategories = [
    'visual_style', 'audio_music', 'creator_technique', 'meme_format', 
    'product_brand', 'behavior_pattern', 'political', 'finance', 
    'news_events', 'education', 'relationship', 'animals_pets', 
    'automotive', 'food_drink', 'technology', 'sports', 
    'dance', 'travel', 'fashion', 'gaming', 'health', 
    'diy_crafts', 'music', 'brand', 'social_cause'
  ];
  
  // Check if it's already a valid database category
  if (displayCategory && validCategories.includes(displayCategory)) {
    console.log('[getSafeCategory] Already valid:', displayCategory);
    return displayCategory;
  }
  
  // Default fallback - use creator_technique as generic content creation category
  console.log('[getSafeCategory] Fallback to: creator_technique');
  return 'creator_technique';
}

// Safe status function to ensure we NEVER use 'pending'
export function getSafeStatus(status: string | undefined | null): string {
  // ONLY valid enum values from the RLS policies
  const validStatuses = ['submitted', 'validating', 'validated', 'rejected', 'viral'];
  
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
    console.log('Meme/Humor:', getSafeCategory('Meme/Humor'));
    console.log('Fashion/Beauty:', getSafeCategory('Fashion/Beauty'));
    console.log('invalid:', getSafeCategory('invalid'));
    console.log('null:', getSafeCategory(null));
    console.log('meme:', getSafeCategory('meme'));
  };
  
  (window as any).testSafeStatus = () => {
    console.log('Testing getSafeStatus...');
    console.log('pending:', getSafeStatus('pending'));
    console.log('submitted:', getSafeStatus('submitted'));
    console.log('invalid:', getSafeStatus('invalid'));
    console.log('null:', getSafeStatus(null));
  };
}