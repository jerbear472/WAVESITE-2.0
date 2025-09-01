// Isolated category mapping to prevent any state issues
export function getSafeCategory(displayCategory: string | undefined | null): string {
  console.log('[getSafeCategory] Input:', displayCategory);
  
  // Map UI categories to actual category values
  // We now use the actual category names instead of deprecated field names
  const mapping: Record<string, string> = {
    // Direct mappings from SmartTrendSubmission component IDs
    'meme': 'meme',
    'fashion': 'fashion',
    'food': 'food',
    'music': 'music',
    'tech': 'tech',
    'technology': 'tech',
    'finance': 'finance',
    'sports': 'sports',
    'political': 'political',
    'cars': 'cars',
    'animals': 'animals',
    'travel': 'travel',
    'education': 'education',
    'science': 'science',
    'entertainment': 'entertainment',
    'art': 'art',
    'relationships': 'relationships',
    'health': 'health',
    
    // Label mappings (what user sees in the UI)
    'Meme/Humor': 'meme',
    'Fashion/Beauty': 'fashion',
    'Food/Drink': 'food',
    'Music/Dance': 'music',
    'Tech/Gaming': 'tech',
    'Finance/Crypto': 'finance',
    'Sports/Fitness': 'sports',
    'Political/Social': 'political',
    'Cars & Machines': 'cars',
    'Animals & Pets': 'animals',
    'Travel & Places': 'travel',
    'Education & Learning': 'education',
    'Science & Tech': 'science',
    'Entertainment': 'entertainment',
    'Art & Design': 'art',
    'Relationships': 'relationships',
    'Health & Wellness': 'health',
    
    // No legacy mappings - removed nonsensical categories
    
    // Lowercase versions (for flexible input handling)
    'cars & machines': 'cars',
    'animals & pets': 'animals',
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
  
  // Check if it's already a valid category
  const validCategories = [
    'meme', 'fashion', 'food', 'music', 'tech', 
    'finance', 'sports', 'political', 'cars', 'animals', 'travel',
    'education', 'science', 'entertainment', 'art', 'relationships', 'health'
  ];
  if (displayCategory && validCategories.includes(displayCategory)) {
    console.log('[getSafeCategory] Already valid:', displayCategory);
    return displayCategory;
  }
  
  // Default fallback - use entertainment as more generic
  console.log('[getSafeCategory] Fallback to: entertainment');
  return 'entertainment';
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