import { Platform } from 'react-native';

let TextRecognition: any = null;
try {
  // Only import MLKit on iOS device builds (not simulator)
  if (Platform.OS === 'ios' && !__DEV__) {
    TextRecognition = require('@react-native-ml-kit/text-recognition').default;
  }
} catch (e) {
  console.warn('MLKit TextRecognition not available in this build');
}
import { CapturedPost } from '../config/supabase';

interface ExtractedData {
  creator_handle: string;
  caption: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  song_info?: string;
  dwell_time: number;
}

export class PostDataExtractor {
  private lastExtractTime: number = 0;
  private currentPostStartTime: number = 0;

  async extractPostData(
    frameData: any, 
    platform: 'tiktok' | 'instagram'
  ): Promise<ExtractedData | null> {
    try {
      // Check if TextRecognition is available
      if (!TextRecognition) {
        console.warn('TextRecognition not available - returning mock data for development');
        return {
          creator_handle: '@mock_user',
          caption: 'Mock caption for development',
          likes_count: 1000,
          comments_count: 50,
          shares_count: 10,
          dwell_time: 5
        };
      }

      // Perform OCR on the frame
      const result = await TextRecognition.recognize(frameData);
      
      if (!result.text) {
        return null;
      }

      const extractedText = result.text;
      const textBlocks = result.blocks;

      // Platform-specific extraction
      if (platform === 'tiktok') {
        return this.extractTikTokData(extractedText, textBlocks);
      } else {
        return this.extractInstagramData(extractedText, textBlocks);
      }
    } catch (error) {
      console.error('Error extracting post data:', error);
      return null;
    }
  }

  private extractTikTokData(text: string, blocks: any[]): ExtractedData | null {
    try {
      // TikTok specific patterns
      const data: Partial<ExtractedData> = {};

      // Extract creator handle (@username)
      const handleMatch = text.match(/@[\w.]+/);
      if (handleMatch) {
        data.creator_handle = handleMatch[0];
      }

      // Extract engagement metrics
      // TikTok shows likes as "123.4K", comments as numbers, shares as numbers
      const metricsPattern = /(\d+(?:\.\d+)?[KMB]?)\s*(❤️|💬|➤|likes|comments|shares)/gi;
      const matches = text.matchAll(metricsPattern);

      for (const match of matches) {
        const value = this.parseMetricValue(match[1]);
        const type = match[2].toLowerCase();

        if (type.includes('❤') || type.includes('like')) {
          data.likes_count = value;
        } else if (type.includes('💬') || type.includes('comment')) {
          data.comments_count = value;
        } else if (type.includes('➤') || type.includes('share')) {
          data.shares_count = value;
        }
      }

      // Extract song info (usually shown with music note ♪)
      const songMatch = text.match(/♪\s*([^♪\n]+)/);
      if (songMatch) {
        data.song_info = songMatch[1].trim();
      }

      // Extract caption (usually the largest text block that's not metrics)
      const captionBlocks = blocks.filter(block => {
        const blockText = block.text || '';
        return blockText.length > 20 && 
               !blockText.match(/^[@#]/) && 
               !blockText.match(/\d+[KMB]?\s*(likes|comments|shares)/i);
      });

      if (captionBlocks.length > 0) {
        data.caption = captionBlocks[0].text;
      }

      // Calculate dwell time
      const currentTime = Date.now();
      if (this.currentPostStartTime === 0) {
        this.currentPostStartTime = currentTime;
      }
      
      data.dwell_time = Math.floor((currentTime - this.lastExtractTime) / 1000);
      this.lastExtractTime = currentTime;

      // Validate required fields
      if (!data.creator_handle || !data.caption) {
        return null;
      }

      return {
        creator_handle: data.creator_handle || '',
        caption: data.caption || '',
        likes_count: data.likes_count || 0,
        comments_count: data.comments_count || 0,
        shares_count: data.shares_count || 0,
        song_info: data.song_info,
        dwell_time: data.dwell_time || 0
      };

    } catch (error) {
      console.error('Error extracting TikTok data:', error);
      return null;
    }
  }

  private extractInstagramData(text: string, blocks: any[]): ExtractedData | null {
    try {
      // Instagram specific patterns
      const data: Partial<ExtractedData> = {};

      // Extract creator handle
      const handleMatch = text.match(/^([\w.]+)(?:\s|$)/m);
      if (handleMatch) {
        data.creator_handle = handleMatch[1];
      }

      // Instagram shows metrics differently
      // Look for patterns like "1,234 likes" or "56 comments"
      const likesMatch = text.match(/(\d{1,3}(?:,\d{3})*)\s*likes?/i);
      if (likesMatch) {
        data.likes_count = parseInt(likesMatch[1].replace(/,/g, ''));
      }

      const commentsMatch = text.match(/View all\s*(\d+)\s*comments?/i) || 
                           text.match(/(\d+)\s*comments?/i);
      if (commentsMatch) {
        data.comments_count = parseInt(commentsMatch[1]);
      }

      // Instagram doesn't show shares directly
      data.shares_count = 0;

      // Extract caption
      const captionBlocks = blocks.filter(block => {
        const blockText = block.text || '';
        return blockText.length > 20 && 
               !blockText.match(/^([\w.]+)$/) && 
               !blockText.match(/\d+\s*(likes?|comments?)/i) &&
               !blockText.match(/^View all/i);
      });

      if (captionBlocks.length > 0) {
        data.caption = captionBlocks[0].text;
      }

      // Audio info (if Reel)
      const audioMatch = text.match(/♪\s*([^♪\n]+)/) || 
                        text.match(/Audio:\s*([^\n]+)/i);
      if (audioMatch) {
        data.song_info = audioMatch[1].trim();
      }

      // Calculate dwell time
      const currentTime = Date.now();
      if (this.currentPostStartTime === 0) {
        this.currentPostStartTime = currentTime;
      }
      
      data.dwell_time = Math.floor((currentTime - this.lastExtractTime) / 1000);
      this.lastExtractTime = currentTime;

      // Validate required fields
      if (!data.creator_handle) {
        return null;
      }

      return {
        creator_handle: data.creator_handle || '',
        caption: data.caption || '',
        likes_count: data.likes_count || 0,
        comments_count: data.comments_count || 0,
        shares_count: data.shares_count || 0,
        song_info: data.song_info,
        dwell_time: data.dwell_time || 0
      };

    } catch (error) {
      console.error('Error extracting Instagram data:', error);
      return null;
    }
  }

  private parseMetricValue(value: string): number {
    const multipliers: { [key: string]: number } = {
      'K': 1000,
      'M': 1000000,
      'B': 1000000000
    };

    const match = value.match(/(\d+(?:\.\d+)?)\s*([KMB])?/i);
    if (!match) return 0;

    const num = parseFloat(match[1]);
    const suffix = match[2]?.toUpperCase();

    if (suffix && multipliers[suffix]) {
      return Math.floor(num * multipliers[suffix]);
    }

    return Math.floor(num);
  }

  resetDwellTime(): void {
    this.currentPostStartTime = Date.now();
    this.lastExtractTime = Date.now();
  }
}