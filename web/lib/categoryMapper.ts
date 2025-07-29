// Category mapper to convert frontend display values to database enum values

// Map of frontend display values to database enum values
// Database enum values: 'visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern'
export const CATEGORY_MAP: Record<string, string> = {
  // Frontend -> Database (matching actual database enum values)
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
  // Additional mappings
  'Entertainment': 'audio_music',
  'Travel': 'behavior_pattern',
  'Business': 'behavior_pattern',
  'Health & Wellness': 'behavior_pattern',
  'Pets & Animals': 'behavior_pattern',
  // New categories
  'Luxury': 'product_brand',
  'Celebrity': 'behavior_pattern',
  'Meme Coin': 'meme_format',
  'Meme Stock': 'meme_format',
  // Direct mappings for database values
  'visual_style': 'visual_style',
  'audio_music': 'audio_music',
  'creator_technique': 'creator_technique',
  'meme_format': 'meme_format',
  'product_brand': 'product_brand',
  'behavior_pattern': 'behavior_pattern'
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