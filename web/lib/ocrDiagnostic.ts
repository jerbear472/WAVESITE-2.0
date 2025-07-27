export class OCRDiagnostic {
  static async runDiagnostics(): Promise<{
    tesseractAvailable: boolean;
    browserSupport: boolean;
    webWorkersAvailable: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let tesseractAvailable = false;
    let browserSupport = true;
    let webWorkersAvailable = false;

    // Check if Tesseract is available
    try {
      const Tesseract = await import('tesseract.js');
      tesseractAvailable = !!Tesseract.default || !!Tesseract;
      console.log('Tesseract module loaded:', tesseractAvailable);
    } catch (error) {
      errors.push(`Tesseract.js import failed: ${error}`);
      console.error('Tesseract import error:', error);
    }

    // Check browser support
    if (typeof window === 'undefined') {
      browserSupport = false;
      errors.push('Running in server environment, not browser');
    }

    // Check Web Workers
    if (typeof Worker !== 'undefined') {
      webWorkersAvailable = true;
    } else {
      errors.push('Web Workers not available');
    }

    // Check for required APIs
    if (typeof FileReader === 'undefined') {
      errors.push('FileReader API not available');
    }

    if (typeof URL === 'undefined' || !URL.createObjectURL) {
      errors.push('URL.createObjectURL not available');
    }

    return {
      tesseractAvailable,
      browserSupport,
      webWorkersAvailable,
      errors
    };
  }

  static async testTesseractDirectly(): Promise<string> {
    try {
      console.log('Testing Tesseract directly...');
      
      // Try dynamic import
      const Tesseract = (await import('tesseract.js')).default;
      console.log('Tesseract imported:', Tesseract);

      // Create a simple test image
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 200, 100);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText('TEST 123', 50, 50);
      }

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      console.log('Test image created, size:', blob.size);

      // Try OCR
      const result = await Tesseract.recognize(
        blob,
        'eng',
        {
          logger: m => console.log('Tesseract progress:', m)
        }
      );

      console.log('OCR result:', result.data.text);
      return result.data.text;
    } catch (error) {
      console.error('Direct Tesseract test failed:', error);
      throw error;
    }
  }
}