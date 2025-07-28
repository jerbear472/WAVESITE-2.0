// Test category mapping directly
import { mapCategoryToEnum } from './web/lib/categoryMapper.js';

console.log('Testing category mappings:');
const testCategories = [
  'Fashion & Beauty',
  'Food & Drink', 
  'Humor & Memes',
  'Lifestyle',
  'Music & Dance',
  'Tech & Gaming'
];

testCategories.forEach(cat => {
  const mapped = mapCategoryToEnum(cat);
  console.log(`"${cat}" → "${mapped}"`);
});

console.log('\nExpected mappings:');
console.log('"Humor & Memes" should map to "meme_format"');
console.log('"Lifestyle" should map to "behavior_pattern"');
console.log('"Fashion & Beauty" should map to "visual_style"');