import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export const runtime = 'nodejs'; // Use Node.js runtime for better compatibility

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    console.log('Processing OCR for:', imageFile.name);

    // Convert file to buffer
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Perform OCR
    const result = await Tesseract.recognize(
      buffer,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    const text = result.data.text;
    console.log('OCR completed, extracted text length:', text.length);

    // Parse the extracted text
    const ocrResult = parseOCRText(text);

    return NextResponse.json({
      success: true,
      data: ocrResult,
      rawText: text
    });

  } catch (error) {
    console.error('OCR API error:', error);
    return NextResponse.json(
      { 
        error: 'OCR processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function parseOCRText(text: string) {
  const result: any = {};
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const fullText = text.replace(/\n/g, ' ');

  // Extract handle
  const handlePattern = /@[\w.]+/;
  const handleMatch = fullText.match(handlePattern);
  if (handleMatch) {
    result.handle = handleMatch[0];
  }

  // Extract numbers for engagement metrics
  const patterns = {
    likes: /(\d+(?:[,.]?\d+)*)\s*([KMB]?)\s*(?:likes?|❤️|♥️|👍)/gi,
    comments: /(\d+(?:[,.]?\d+)*)\s*([KMB]?)\s*(?:comments?|💬)/gi,
    shares: /(\d+(?:[,.]?\d+)*)\s*([KMB]?)\s*(?:shares?|🔄|↗️)/gi,
    views: /(\d+(?:[,.]?\d+)*)\s*([KMB]?)\s*(?:views?|👁️|👀)/gi,
  };

  // Parse each metric
  for (const [metric, pattern] of Object.entries(patterns)) {
    const matches = Array.from(fullText.matchAll(pattern));
    if (matches.length > 0) {
      const [, number, suffix] = matches[0];
      let value = parseFloat(number.replace(/[,]/g, ''));
      
      if (suffix === 'K' || suffix === 'k') value *= 1000;
      else if (suffix === 'M' || suffix === 'm') value *= 1000000;
      else if (suffix === 'B' || suffix === 'b') value *= 1000000000;
      
      result[metric] = Math.round(value);
    }
  }

  // Extract hashtags
  const hashtagPattern = /#\w+/g;
  const hashtags = fullText.match(hashtagPattern);
  if (hashtags) {
    result.hashtags = hashtags.map(tag => tag.substring(1));
  }

  // Extract caption (longer text that's not a metric)
  const captionLines = lines.filter(line => {
    return line.length > 20 && 
           !line.match(/^@/) && 
           !line.match(/^\d+[\s,.]*(K|M|B)?[\s]*(likes?|comments?|shares?|views?)/i) &&
           !line.match(/^#/);
  });

  if (captionLines.length > 0) {
    result.caption = captionLines.join(' ').substring(0, 200);
  }

  // Platform detection
  const lowerText = fullText.toLowerCase();
  if (lowerText.includes('tiktok') || lowerText.includes('for you') || lowerText.includes('fyp')) {
    result.platform = 'tiktok';
  } else if (lowerText.includes('instagram') || lowerText.includes('reels') || lowerText.includes('stories')) {
    result.platform = 'instagram';
  }

  return result;
}