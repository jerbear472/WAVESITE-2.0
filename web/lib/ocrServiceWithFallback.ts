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
  error?: string;
}

export class OCRServiceWithFallback {
  // Fallback mock data for testing when OCR fails
  private static getMockData(): OCRResult {
    console.warn('Using fallback mock data due to OCR failure');
    return {
      handle: '@demo_user',
      likes: 12500,
      comments: 342,
      shares: 89,
      caption: 'This is demo data. Please ensure Tesseract.js is properly loaded.',
      hashtags: ['demo', 'test'],
      platform: 'tiktok',
      error: 'OCR failed - using demo data'
    };
  }

  static async extractTextFromImage(imageFile: File, debug: boolean = false): Promise<OCRResult & { rawText?: string }> {
    try {
      console.log('Starting OCR analysis for:', imageFile.name);
      
      // Try Tesseract first
      try {
        const result = await this.performTesseractOCR(imageFile, debug);
        if (result && Object.keys(result).length > 1) { // Has more than just rawText
          return result;
        }
      } catch (tesseractError) {
        console.error('Tesseract OCR failed:', tesseractError);
      }
      
      // If Tesseract fails, try alternative approach
      console.log('Falling back to alternative OCR approach...');
      
      // For now, return mock data with a warning
      const mockResult = this.getMockData();
      if (debug) {
        (mockResult as any).rawText = 'OCR failed to process image. This is fallback data.';
      }
      
      return mockResult;
      
    } catch (error) {
      console.error('Complete OCR failure:', error);
      const errorResult = this.getMockData();
      errorResult.error = `OCR Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return errorResult;
    }
  }
  
  private static async performTesseractOCR(imageFile: File, debug: boolean): Promise<OCRResult & { rawText?: string }> {
    // Convert to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });
    
    // Perform OCR
    const { data: { text } } = await Tesseract.recognize(
      base64,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text extracted from image');
    }
    
    console.log('OCR extracted text length:', text.length);
    
    // Parse the text
    const result: OCRResult = {};
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const fullText = text.replace(/\n/g, ' ');
    
    // Extract handle
    const handlePattern = /@[\w.]+/;
    const handleMatch = fullText.match(handlePattern);
    if (handleMatch) {
      result.handle = handleMatch[0];
    }
    
    // Extract numbers with improved patterns
    const patterns = [
      /(\d+(?:[,.]?\d+)*)\s*([KMB]?)\s*(likes?)/gi,
      /(\d+(?:[,.]?\d+)*)\s*([KMB]?)\s*(comments?)/gi,
      /(\d+(?:[,.]?\d+)*)\s*([KMB]?)\s*(shares?)/gi,
      /(\d+(?:[,.]?\d+)*)\s*([KMB]?)\s*(views?)/gi,
    ];
    
    for (const pattern of patterns) {
      const match = fullText.match(pattern);
      if (match && match[0]) {
        const [, number, suffix, type] = pattern.exec(match[0]) || [];
        if (number) {
          let value = parseFloat(number.replace(/,/g, ''));
          if (suffix === 'K') value *= 1000;
          else if (suffix === 'M') value *= 1000000;
          else if (suffix === 'B') value *= 1000000000;
          
          const typeStr = type.toLowerCase();
          if (typeStr.includes('like')) result.likes = Math.round(value);
          else if (typeStr.includes('comment')) result.comments = Math.round(value);
          else if (typeStr.includes('share')) result.shares = Math.round(value);
          else if (typeStr.includes('view')) result.views = Math.round(value);
        }
      }
    }
    
    // Extract hashtags
    const hashtagPattern = /#\w+/g;
    const hashtags = fullText.match(hashtagPattern);
    if (hashtags) {
      result.hashtags = hashtags.map(tag => tag.substring(1));
    }
    
    // Extract caption
    const captionLines = lines.filter(line => {
      return line.length > 20 && 
             !line.match(/^@/) && 
             !line.match(/^\d+[\s,.]*(K|M|B)?[\s]*(likes?|comments?|shares?|views?)/i);
    });
    
    if (captionLines.length > 0) {
      result.caption = captionLines.join(' ').substring(0, 200);
    }
    
    // Detect platform
    const lowerText = fullText.toLowerCase();
    if (lowerText.includes('tiktok') || lowerText.includes('for you') || lowerText.includes('fyp')) {
      result.platform = 'tiktok';
    } else if (lowerText.includes('instagram') || lowerText.includes('reels') || lowerText.includes('stories')) {
      result.platform = 'instagram';
    }
    
    if (debug) {
      (result as any).rawText = text;
    }
    
    return result;
  }
  
  // Enhanced analysis with platform detection
  static async analyzeScreenshot(imageFile: File): Promise<{
    platform: 'tiktok' | 'instagram' | 'unknown';
    extractedData: OCRResult;
    confidence: number;
  }> {
    const extractedData = await this.extractTextFromImage(imageFile);
    
    // Calculate confidence
    let confidence = 0.5;
    if (!extractedData.error) {
      if (extractedData.platform && extractedData.platform !== 'unknown') confidence += 0.2;
      if (extractedData.handle) confidence += 0.1;
      if (extractedData.likes || extractedData.views) confidence += 0.1;
      if (extractedData.caption) confidence += 0.05;
      if (extractedData.hashtags && extractedData.hashtags.length > 0) confidence += 0.05;
    } else {
      confidence = 0.1; // Very low confidence for fallback data
    }
    
    return {
      platform: extractedData.platform || 'unknown',
      extractedData,
      confidence: Math.min(confidence, 0.95)
    };
  }
}