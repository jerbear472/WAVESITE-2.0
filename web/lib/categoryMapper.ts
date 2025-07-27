// Category mapper to convert frontend display values to database enum values

// Map of frontend display values to database enum values
export const CATEGORY_MAP: Record<string, string> = {
  // Frontend -> Database
  'Fashion & Beauty': 'fashion_beauty',
  'Food & Drink': 'food_drink',
  'Humor & Memes': 'humor_memes',
  'Lifestyle': 'lifestyle',
  'Politics & Social Issues': 'politics_social',
  'Music & Dance': 'music_dance',
  'Sports & Fitness': 'sports_fitness',
  'Tech & Gaming': 'tech_gaming',
  'Art & Creativity': 'art_creativity',
  'Education & Science': 'education_science',
  // Add any other categories your form uses
  'Entertainment': 'entertainment',
  'Travel': 'travel',
  'Business': 'business',
  'Health & Wellness': 'health_wellness',
  'Pets & Animals': 'pets_animals'
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