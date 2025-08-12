'use client';

import { useState } from 'react';
import { EnhancedVercelSafeThumbnailExtractor } from '@/lib/enhancedVercelSafeThumbnailExtractor';

export default function TestSubmitPage() {
  const [url, setUrl] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testExtraction = async () => {
    if (!url) return;
    
    setLoading(true);
    try {
      console.log('🧪 Testing extraction for:', url);
      
      const metadata = await EnhancedVercelSafeThumbnailExtractor.extractFromUrl(url);
      console.log('📊 Extraction result:', metadata);
      
      setExtractedData(metadata);
    } catch (error) {
      console.error('❌ Extraction error:', error);
      setExtractedData({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const sampleUrls = [
    { label: 'TikTok', url: 'https://www.tiktok.com/@zachking/video/7234567890123456789' },
    { label: 'YouTube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { label: 'Instagram', url: 'https://www.instagram.com/p/ABC123XYZ/' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Thumbnail Extraction Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test URL Input</h2>
          
          <div className="space-y-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a social media URL..."
              className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400"
            />
            
            <div className="flex gap-2">
              <button
                onClick={testExtraction}
                disabled={loading || !url}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {loading ? '⏳ Extracting...' : '🚀 Extract Thumbnail'}
              </button>
              
              {sampleUrls.map((sample) => (
                <button
                  key={sample.label}
                  onClick={() => setUrl(sample.url)}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {extractedData && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Extraction Results</h2>
            
            {extractedData.error ? (
              <div className="text-red-400">
                <p className="font-semibold">❌ Error:</p>
                <p>{extractedData.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Platform</p>
                    <p className="font-semibold">{extractedData.platform || 'Unknown'}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400 text-sm">Creator</p>
                    <p className="font-semibold">{extractedData.creator_handle || 'Not found'}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm mb-2">Thumbnail URL</p>
                  {extractedData.thumbnail_url ? (
                    <>
                      <p className="text-green-400 mb-2">✅ Successfully extracted!</p>
                      <div className="bg-gray-700 p-3 rounded text-xs break-all mb-4">
                        {extractedData.thumbnail_url}
                      </div>
                      <div className="bg-gray-700 p-4 rounded">
                        <img 
                          src={extractedData.thumbnail_url}
                          alt="Extracted thumbnail"
                          className="max-w-full h-auto rounded"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23374151"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23ef4444"%3EFailed to load image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-red-400">❌ No thumbnail extracted</p>
                  )}
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm mb-2">Raw Data</p>
                  <pre className="bg-gray-700 p-4 rounded text-xs overflow-auto">
                    {JSON.stringify(extractedData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-8 bg-blue-900/20 border border-blue-600 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">ℹ️ How to Test</h3>
          <ol className="text-sm text-gray-300 space-y-1">
            <li>1. Go to the Submit page: <a href="/submit" className="text-blue-400 hover:underline">http://localhost:3001/submit</a></li>
            <li>2. Paste a TikTok/YouTube/Instagram URL</li>
            <li>3. Click "Add Trend Details"</li>
            <li>4. Check browser console for thumbnail extraction logs</li>
            <li>5. Verify the thumbnail appears in the form</li>
          </ol>
        </div>
      </div>
    </div>
  );
}