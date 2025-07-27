import Tesseract from 'tesseract.js';

interface OCRResult {
  handle?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  caption?: string;
  hashtags?: string[];
  platform?: 'tiktok' | 'instagram';
}

export class OCRService {
  // Real OCR implementation using Tesseract.js
  
  static async extractTextFromImage(imageFile: File, debug: boolean = false): Promise<OCRResult & { rawText?: string }> {
    try {
      console.log('Starting OCR for file:', imageFile.name, 'Size:', imageFile.size);
      
      // Convert File to base64 for better compatibility
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      
      console.log('Image converted to base64');
      
      // Use simpler Tesseract API
      const result = await Tesseract.recognize(
        base64,
        'eng',
        {
          logger: m => console.log('OCR Progress:', m)
        }
      );
      
      const text = ocrResult.data.text;
      console.log('OCR completed, text length:', text.length);
      
      // Parse the extracted text to find relevant information
      const ocrResult: OCRResult = {};
      
      // Split text into lines for easier parsing
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Extract handle (starts with @)
      const handlePattern = /@[\w.]+/;
      for (const line of lines) {
        const handleMatch = line.match(handlePattern);
        if (handleMatch) {
          ocrResult.handle = handleMatch[0];
          break;
        }
      }
      
      // Extract numbers for likes, comments, shares, views
      // Look for patterns like "1.2M likes", "324K comments", etc.
      // Also handle patterns without space: "1.2Mlikes", "324Kviews"
      const numberPattern = /(\d+(?:[,.]?\d+)*)\s*([KMB]?)\s*(likes?|comments?|shares?|views?|views)/gi;
      const numberPatternNoSpace = /(\d+(?:[,.]?\d+)*)([KMB])(likes?|comments?|shares?|views?)/gi;
      const fullText = text.replace(/\n/g, ' ');
      
      // Helper function to parse number values
      const parseNumberValue = (number: string, suffix: string) => {
        let value = parseFloat(number.replace(/[,]/g, '.'));
        if (suffix === 'K' || suffix === 'k') value *= 1000;
        else if (suffix === 'M' || suffix === 'm') value *= 1000000;
        else if (suffix === 'B' || suffix === 'b') value *= 1000000000;
        return Math.round(value);
      };
      
      // Try both patterns
      const patterns = [numberPattern, numberPatternNoSpace];
      for (const pattern of patterns) {
        let match;
        pattern.lastIndex = 0; // Reset regex
        while ((match = pattern.exec(fullText)) !== null) {
          const [fullMatch, number, suffix, type] = match;
          const value = parseNumberValue(number, suffix);
          
          // Assign to appropriate field
          const typeStr = type.toLowerCase();
          if (typeStr.includes('like') && !ocrResult.likes) {
            ocrResult.likes = value;
          } else if (typeStr.includes('comment') && !ocrResult.comments) {
            ocrResult.comments = value;
          } else if (typeStr.includes('share') && !ocrResult.shares) {
            ocrResult.shares = value;
          } else if (typeStr.includes('view') && !ocrResult.views) {
            ocrResult.views = value;
          }
        }
      }
      
      // Also try to find standalone numbers that might be metrics
      // Common patterns: heart/like icon followed by number
      const standalonePattern = /[❤️♥️👍💙]\s*(\d+(?:[,.]?\d+)*)\s*([KMB]?)/gi;
      let standaloneMatch;
      while ((standaloneMatch = standalonePattern.exec(fullText)) !== null) {
        const [fullMatch, number, suffix] = standaloneMatch;
        if (!ocrResult.likes) {
          ocrResult.likes = parseNumberValue(number, suffix);
        }
      }
      
      // Extract hashtags
      const hashtagPattern = /#\w+/g;
      const hashtags = fullText.match(hashtagPattern);
      if (hashtags) {
        ocrResult.hashtags = hashtags.map(tag => tag.substring(1));
      }
      
      // Extract caption (text that's not a handle or hashtag, usually longer phrases)
      const captionLines = lines.filter(line => {
        return line.length > 20 && 
               !line.match(/^\@/) && 
               !line.match(/^\d+[\s,.]*(K|M|B)?[\s]*(likes?|comments?|shares?|views?)/i);
      });
      
      if (captionLines.length > 0) {
        ocrResult.caption = captionLines.join(' ').substring(0, 200); // Limit caption length
      }
      
      // Try to detect platform based on UI elements or text patterns
      const lowerText = fullText.toLowerCase();
      if (lowerText.includes('tiktok') || lowerText.includes('for you') || lowerText.includes('fyp')) {
        ocrResult.platform = 'tiktok';
      } else if (lowerText.includes('instagram') || lowerText.includes('reels') || lowerText.includes('stories')) {
        ocrResult.platform = 'instagram';
      }
      
      // Include raw text in debug mode
      if (debug) {
        (result as any).rawText = text;
      }
      
      // Log extraction results for debugging
      console.log('OCR Extraction Results:', {
        textLength: text.length,
        linesFound: lines.length,
        ...result
      });
      
      return result;
      
    } catch (error) {
      console.error('OCR processing error:', error);
      // Return empty result on error
      return {};
    }
  }
  
  // Advanced OCR with platform detection
  static async analyzeScreenshot(imageFile: File): Promise<{
    platform: 'tiktok' | 'instagram' | 'unknown';
    extractedData: OCRResult;
    confidence: number;
  }> {
    const extractedData = await this.extractTextFromImage(imageFile);
    
    // Calculate confidence based on how much data was extracted
    let confidence = 0.5; // Base confidence
    
    if (extractedData.platform && extractedData.platform !== 'unknown') {
      confidence += 0.2;
    }
    if (extractedData.handle) {
      confidence += 0.1;
    }
    if (extractedData.likes || extractedData.views) {
      confidence += 0.1;
    }
    if (extractedData.caption) {
      confidence += 0.05;
    }
    if (extractedData.hashtags && extractedData.hashtags.length > 0) {
      confidence += 0.05;
    }
    
    // Cap confidence at 0.95
    confidence = Math.min(confidence, 0.95);
    
    return {
      platform: extractedData.platform || 'unknown',
      extractedData,
      confidence
    };
  }
  
  // Parse specific platform formats
  static parseTikTokFormat(text: string): Partial<OCRResult> {
    const result: Partial<OCRResult> = {};
    
    // Extract handle (starts with @)
    const handleMatch = text.match(/@[\w.]+/);
    if (handleMatch) {
      ocrResult.handle = handleMatch[0];
    }
    
    // Extract numbers (likes, comments, shares)
    const numbers = text.match(/(\d+(?:\.\d+)?[KMB]?)/g);
    if (numbers && numbers.length > 0) {
      ocrResult.likes = this.parseNumber(numbers[0]);
      if (numbers.length > 1) ocrResult.comments = this.parseNumber(numbers[1]);
      if (numbers.length > 2) ocrResult.shares = this.parseNumber(numbers[2]);
    }
    
    // Extract hashtags
    const hashtags = text.match(/#\w+/g);
    if (hashtags) {
      ocrResult.hashtags = hashtags.map(tag => tag.substring(1));
    }
    
    return result;
  }
  
  static parseInstagramFormat(text: string): Partial<OCRResult> {
    const result: Partial<OCRResult> = {};
    
    // Similar parsing logic for Instagram format
    const handleMatch = text.match(/@[\w.]+/);
    if (handleMatch) {
      ocrResult.handle = handleMatch[0];
    }
    
    // Instagram shows likes differently
    const likesMatch = text.match(/(\d+(?:,\d+)*)\s*likes?/i);
    if (likesMatch) {
      ocrResult.likes = parseInt(likesMatch[1].replace(/,/g, ''));
    }
    
    // Extract views for reels
    const viewsMatch = text.match(/(\d+(?:,\d+)*)\s*views?/i);
    if (viewsMatch) {
      ocrResult.views = parseInt(viewsMatch[1].replace(/,/g, ''));
    }
    
    return result;
  }
  
  // Helper to parse numbers with K, M, B suffixes
  private static parseNumber(str: string): number {
    const num = parseFloat(str.replace(/[^\d.]/g, ''));
    if (str.includes('K')) return num * 1000;
    if (str.includes('M')) return num * 1000000;
    if (str.includes('B')) return num * 1000000000;
    return num;
  }
}