// Simple, working thumbnail extractor
// Only returns thumbnails that actually work reliably

import { getSimpleThumbnail, getPlatformFromUrl, getCreatorFromUrl } from './simpleThumbnail';

interface SimpleMetadata {
  thumbnail_url?: string;
  creator_handle?: string;
  platform?: string;
}

export class SimpleThumbnailExtractor {
  static async extractFromUrl(url: string): Promise<SimpleMetadata> {
    console.log('🎯 Simple extraction for:', url);
    
    const metadata: SimpleMetadata = {
      platform: getPlatformFromUrl(url),
      creator_handle: getCreatorFromUrl(url),
      thumbnail_url: getSimpleThumbnail(url) || undefined
    };
    
    if (metadata.thumbnail_url) {
      console.log('✅ Got thumbnail:', metadata.thumbnail_url);
    } else {
      console.log('⚠️ No reliable thumbnail available for this platform');
    }
    
    return metadata;
  }
}