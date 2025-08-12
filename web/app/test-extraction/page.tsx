'use client';

import { useState } from 'react';
import { ImprovedMetadataExtractor } from '@/lib/improvedMetadataExtractor';
import { VercelSafeMetadataExtractor } from '@/lib/vercelSafeMetadataExtractor';

export default function TestExtractionPage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testExtraction = async (useVercelSafe = true) => {
    if (!url) return;
    
    setLoading(true);
    try {
      console.log('Testing extraction for:', url);
      console.log('Using:', useVercelSafe ? 'VercelSafeMetadataExtractor' : 'ImprovedMetadataExtractor');
      
      const metadata = useVercelSafe 
        ? await VercelSafeMetadataExtractor.extractFromUrl(url)
        : await ImprovedMetadataExtractor.extractFromUrl(url);
        
      console.log('Extraction result:', metadata);
      setResult(metadata);
    } catch (error) {
      console.error('Extraction error:', error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testUrls = [
    'https://www.tiktok.com/@username/video/7234567890123456789',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.instagram.com/p/ABC123/',
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Thumbnail Extraction Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Test URL:</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Paste a social media URL..."
            />
          </div>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => testExtraction(true)}
              disabled={loading || !url}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Vercel-Safe'}
            </button>
            
            <button
              onClick={() => testExtraction(false)}
              disabled={loading || !url}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Improved'}
            </button>
            
            {testUrls.map((testUrl, i) => (
              <button
                key={i}
                onClick={() => setUrl(testUrl)}
                className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-xs"
              >
                Test {i + 1}
              </button>
            ))}
          </div>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Extraction Result:</h2>
            
            {result.error ? (
              <div className="text-red-600">Error: {result.error}</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <strong>Platform:</strong> {result.platform || 'Unknown'}
                </div>
                
                <div>
                  <strong>Thumbnail URL:</strong>
                  {result.thumbnail_url ? (
                    <div>
                      <p className="text-green-600 mb-2">✅ Captured!</p>
                      <p className="text-sm text-gray-600 break-all mb-2">{result.thumbnail_url}</p>
                      <img 
                        src={result.thumbnail_url} 
                        alt="Thumbnail" 
                        className="w-64 h-48 object-cover border rounded"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect width="200" height="150" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EFailed to load%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-red-600">❌ Not captured</p>
                  )}
                </div>
                
                <div>
                  <strong>Creator:</strong> {result.creator_handle || result.creator_name || 'Unknown'}
                </div>
                
                <div>
                  <strong>Caption:</strong> {result.post_caption || 'None'}
                </div>
                
                <div>
                  <strong>Raw JSON:</strong>
                  <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}