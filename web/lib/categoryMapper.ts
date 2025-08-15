// Category mapper to convert frontend display values to database enum values

// Map of frontend display values to database enum values
// Database enum values: 'visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern'
export const CATEGORY_MAP: Record<string, string> = {
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
  
  // Frontend display labels -> Database
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
  
  // Legacy mappings (backward compatibility)
  'Fashion & Beauty': 'fashion',
  'Food & Drink': 'food_drink',
  'Humor & Memes': 'meme_format',
  'Politics & Social Issues': 'political',
  'Music & Dance': 'audio_music',
  'Sports & Fitness': 'sports',
  'Tech & Gaming': 'technology',
  'Art & Creativity': 'visual_style',
  'Education & Science': 'education',
  'Entertainment': 'audio_music',
  'Business': 'behavior_pattern',
  'Pets & Animals': 'animals_pets',
  'Luxury': 'product_brand',
  'Celebrity': 'behavior_pattern',
  'Meme Coin': 'meme_format',
  'Meme Stock': 'meme_format',
  
  // Direct database enum values (pass-through) - only ones not already mapped above
  'visual_style': 'visual_style',
  'audio_music': 'audio_music',
  'creator_technique': 'creator_technique',
  'meme_format': 'meme_format',
  'product_brand': 'product_brand',
  'behavior_pattern': 'behavior_pattern',
  'news_events': 'news_events',
  'relationship': 'relationship',
  'dance': 'dance',
  'gaming': 'gaming',
  'diy_crafts': 'diy_crafts'
};

/**
 * Convert a frontend category display value to database enum value
 * @param displayCategory - The category as shown in the UI (e.g., "Humor & Memes")
 * @returns The database-friendly enum value (e.g., "humor_memes")
 */
export function mapCategoryToEnum(displayCategory: string): string {
  // First check if there's an explicit mapping
  if (CATEGORY_MAP[displayCategory]) {
    return CATEGORY_MAP[displayCategory];
  }
  
  // Fallback: convert to database-friendly format
  return displayCategory
    .toLowerCase()
    .replace(/\s*&\s*/g, '_')  // Replace & with underscore
    .replace(/\s+/g, '_')       // Replace spaces with underscores
    .replace(/[^a-z0-9_]/g, '') // Remove any other special characters
    .replace(/_+/g, '_')        // Remove duplicate underscores
    .replace(/^_|_$/g, '');     // Remove leading/trailing underscores
}

/**
 * Convert multiple categories
 * @param categories - Array of display categories
 * @returns Array of database enum values
 */
export function mapCategoriesToEnum(categories: string[]): string[] {
  return categories.map(cat => mapCategoryToEnum(cat));
}

// Reverse mapping for displaying database values in UI
export const CATEGORY_DISPLAY_MAP: Record<string, string> = Object.entries(CATEGORY_MAP).reduce(
  (acc, [display, db]) => ({ ...acc, [db]: display }),
  {}
);

/**
 * Convert database enum value back to display value
 * @param enumValue - The database enum value (e.g., "humor_memes")
 * @returns The display value (e.g., "Humor & Memes")
 */
export function mapEnumToDisplay(enumValue: string): string {
  return CATEGORY_DISPLAY_MAP[enumValue] || enumValue;
}