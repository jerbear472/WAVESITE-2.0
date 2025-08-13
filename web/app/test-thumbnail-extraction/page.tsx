'use client';

import { useState } from 'react';

export default function TestThumbnailExtraction() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const testExtraction = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Test the API endpoint
      const response = await fetch('/api/tiktok-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract thumbnail');
      }

      console.log('API Response:', data);
      setResult(data);
    } catch (err: any) {
      console.error('Extraction error:', err);
      setError(err.message || 'Failed to extract thumbnail');
    } finally {
      setLoading(false);
    }
  };

  const testProxyImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        console.log('✅ Proxy image loads successfully');
      } else {
        console.error('❌ Proxy image failed to load:', response.status);
      }
    } catch (err) {
      console.error('❌ Proxy image error:', err);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Thumbnail Extraction</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">TikTok URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@username/video/1234567890"
                className="w-full p-3 border rounded-lg"
              />
            </div>
            
            <button
              onClick={testExtraction}
              disabled={loading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Extracting...' : 'Extract Thumbnail'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
            <p className="text-red-600">Error: {error}</p>
          </div>
        )}

        {result && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Extraction Result</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Thumbnail URL (Proxied):</p>
                <p className="text-xs break-all bg-gray-100 p-2 rounded">{result.thumbnail_url}</p>
              </div>
              
              {result.original_url && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Original CDN URL:</p>
                  <p className="text-xs break-all bg-gray-100 p-2 rounded">{result.original_url}</p>
                </div>
              )}
              
              {result.creator_handle && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Creator:</p>
                  <p className="font-medium">{result.creator_handle}</p>
                </div>
              )}
              
              {result.title && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Title:</p>
                  <p>{result.title}</p>
                </div>
              )}
              
              {result.thumbnail_url && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Preview:</p>
                  <div className="border rounded-lg overflow-hidden">
                    <img 
                      src={result.thumbnail_url} 
                      alt="Thumbnail"
                      className="w-full max-w-md"
                      onLoad={() => {
                        console.log('✅ Thumbnail loaded successfully');
                        testProxyImage(result.thumbnail_url);
                      }}
                      onError={(e) => {
                        console.error('❌ Thumbnail failed to load');
                        console.error('Failed URL:', result.thumbnail_url);
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <p className="text-sm font-medium mb-2">Raw Response:</p>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Test URLs:</h3>
          <ul className="space-y-1 text-sm">
            <li>• https://www.tiktok.com/@zachking/video/7123456789012345678</li>
            <li>• https://www.tiktok.com/@mrbeast/video/7234567890123456789</li>
            <li>• https://www.tiktok.com/@khaby.lame/video/7345678901234567890</li>
          </ul>
        </div>
      </div>
    </div>
  );
}