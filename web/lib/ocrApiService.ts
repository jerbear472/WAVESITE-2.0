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

export class OCRApiService {
  static async extractTextFromImage(imageFile: File, debug: boolean = false): Promise<OCRResult & { rawText?: string }> {
    try {
      console.log('Sending image to OCR API...');
      
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'OCR API request failed');
      }
      
      const result = await response.json();
      console.log('OCR API response:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'OCR processing failed');
      }
      
      const ocrResult: OCRResult & { rawText?: string } = result.data || {};
      
      if (debug && result.rawText) {
        ocrResult.rawText = result.rawText;
      }
      
      return ocrResult;
      
    } catch (error) {
      console.error('OCR API error:', error);
      
      // Return fallback data with error indication
      return {
        handle: '@error_ocr',
        caption: `OCR Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        platform: undefined,
        rawText: debug ? `Error: ${error}` : undefined
      };
    }
  }
  
  static async analyzeScreenshot(imageFile: File): Promise<{
    platform: 'tiktok' | 'instagram' | undefined;
    extractedData: OCRResult;
    confidence: number;
  }> {
    const extractedData = await this.extractTextFromImage(imageFile);
    
    // Calculate confidence based on extracted data
    let confidence = 0.5;
    
    if (extractedData.platform && extractedData.platform !== undefined) {
      confidence += 0.2;
    }
    if (extractedData.handle && !extractedData.handle.includes('error')) {
      confidence += 0.1;
    }
    if (extractedData.likes || extractedData.views) {
      confidence += 0.1;
    }
    if (extractedData.caption && !extractedData.caption.includes('Error')) {
      confidence += 0.05;
    }
    if (extractedData.hashtags && extractedData.hashtags.length > 0) {
      confidence += 0.05;
    }
    
    return {
      platform: extractedData.platform || undefined,
      extractedData,
      confidence: Math.min(confidence, 0.95)
    };
  }
}