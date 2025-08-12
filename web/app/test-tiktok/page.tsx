'use client';

import { useState } from 'react';
import { TikTokThumbnailExtractor } from '@/lib/tiktokThumbnailExtractor';
import { DirectThumbnailExtractor } from '@/lib/directThumbnailExtractor';
import { EnhancedThumbnailExtractor } from '@/lib/enhancedThumbnailExtractor';

export default function TestTikTok() {
  const [url, setUrl] = useState('');
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testExtraction = async () => {
    if (!url) return;
    
    setLoading(true);
    setResults({});
    
    const newResults: any = {
      url,
      timestamp: new Date().toISOString(),
      tests: {}
    };
    
    // Test 1: Quick extraction (no verification)
    try {
      const quickResult = TikTokThumbnailExtractor.extractQuick(url);
      newResults.tests.quick = {
        success: !!quickResult,
        thumbnail: quickResult,
        time: 'instant'
      };
    } catch (error: any) {
      newResults.tests.quick = {
        success: false,
        error: error.message
      };
    }
    
    // Test 2: Direct extraction
    try {
      const directResult = DirectThumbnailExtractor.extractThumbnail(url);
      newResults.tests.direct = {
        success: !!directResult,
        thumbnail: directResult,
        time: 'instant'
      };
    } catch (error: any) {
      newResults.tests.direct = {
        success: false,
        error: error.message
      };
    }
    
    // Test 3: Full extraction with verification
    try {
      const startTime = Date.now();
      const fullResult = await TikTokThumbnailExtractor.extract(url);
      const endTime = Date.now();
      
      newResults.tests.full = {
        success: !!fullResult,
        thumbnail: fullResult,
        time: `${endTime - startTime}ms`
      };
    } catch (error: any) {
      newResults.tests.full = {
        success: false,
        error: error.message
      };
    }
    
    // Test 4: Enhanced extraction
    try {
      const startTime = Date.now();
      const enhancedResult = await EnhancedThumbnailExtractor.getThumbnail(url, 'tiktok');
      const endTime = Date.now();
      
      newResults.tests.enhanced = {
        success: !!enhancedResult.thumbnail_url,
        thumbnail: enhancedResult.thumbnail_url,
        source: enhancedResult.source,
        confidence: enhancedResult.confidence,
        time: `${endTime - startTime}ms`
      };
    } catch (error: any) {
      newResults.tests.enhanced = {
        success: false,
        error: error.message
      };
    }
    
    // Test 5: oEmbed test
    try {
      const startTime = Date.now();
      const oembedResult = await TikTokThumbnailExtractor.extractViaOEmbed(url);
      const endTime = Date.now();
      
      newResults.tests.oembed = {
        success: !!oembedResult,
        thumbnail: oembedResult,
        time: `${endTime - startTime}ms`
      };
    } catch (error: any) {
      newResults.tests.oembed = {
        success: false,
        error: error.message
      };
    }
    
    setResults(newResults);
    setLoading(false);
  };

  const testUrls = [
    'https://www.tiktok.com/@username/video/7234567890123456789',
    'https://vm.tiktok.com/ZMN1234567/',
    'https://www.tiktok.com/@tiktok/video/7234567890123456789?is_from_webapp=1&sender_device=pc'
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">TikTok Thumbnail Extraction Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test URL</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter TikTok URL"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={testExtraction}
              disabled={loading || !url}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Extraction'}
            </button>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Example URLs:</p>
            <div className="space-y-1">
              {testUrls.map((testUrl, index) => (
                <button
                  key={index}
                  onClick={() => setUrl(testUrl)}
                  className="block text-sm text-blue-500 hover:text-blue-700 text-left"
                >
                  {testUrl}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {results.tests && (
          <div className="space-y-6">
            {Object.entries(results.tests).map(([method, result]: [string, any]) => (
              <div key={method} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold capitalize">{method} Extraction</h3>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {result.time && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Time:</span> {result.time}
                    </p>
                  )}
                  
                  {result.source && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Source:</span> {result.source}
                    </p>
                  )}
                  
                  {result.confidence && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Confidence:</span> {result.confidence}
                    </p>
                  )}
                  
                  {result.error && (
                    <p className="text-sm text-red-600">
                      <span className="font-medium">Error:</span> {result.error}
                    </p>
                  )}
                  
                  {result.thumbnail && (
                    <div>
                      <p className="text-sm text-gray-600 font-medium mb-2">Thumbnail URL:</p>
                      <p className="text-xs text-gray-500 break-all bg-gray-50 p-2 rounded">
                        {result.thumbnail}
                      </p>
                      
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 font-medium mb-2">Preview:</p>
                        <div className="border rounded-lg overflow-hidden">
                          <img
                            src={result.thumbnail}
                            alt="TikTok thumbnail"
                            className="w-full max-w-md"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'p-4 bg-red-50 text-red-600 text-sm';
                              errorDiv.textContent = 'Failed to load image (CORS or invalid URL)';
                              target.parentElement?.appendChild(errorDiv);
                            }}
                            onLoad={(e) => {
                              const target = e.target as HTMLImageElement;
                              console.log('Image loaded successfully:', target.src);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}