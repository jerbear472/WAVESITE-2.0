// Test script for TikTok metadata extraction
const { TikTokDirectExtractor } = require('./lib/tiktokDirectExtractor.ts');

// Test URL
const testUrl = 'https://www.tiktok.com/@khaby.lame/video/7158395478974025990';

console.log('Testing TikTok metadata extraction...');
console.log('URL:', testUrl);
console.log('');

const metadata = TikTokDirectExtractor.extract(testUrl);

console.log('Extracted Metadata:');
console.log('- Creator Handle:', metadata.creator_handle);
console.log('- Creator Name:', metadata.creator_name);
console.log('- Video ID:', metadata.video_id);
console.log('- Thumbnail URL:', metadata.thumbnail_url);
console.log('- Posted At:', metadata.posted_at);
console.log('');

const displayThumb = TikTokDirectExtractor.getDisplayThumbnail(testUrl);
console.log('Display Thumbnail:', displayThumb);