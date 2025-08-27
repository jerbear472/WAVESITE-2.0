'use client';

import { useState } from 'react';
import { getUltraSimpleThumbnail } from '@/lib/ultraSimpleThumbnail';

export default function TestTikTokThumbnailPage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [apiResult, setApiResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSimpleExtraction = () => {
    const extracted = getUltraSimpleThumbnail(url);
    setResult(extracted);
    console.log('Simple extraction result:', extracted);
  };

  const testApiExtraction = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tiktok-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiResult(data);
        console.log('API extraction result:', data);
      } else {
        setApiResult({ error: `Failed: ${response.status}` });
      }
    } catch (error: any) {
      setApiResult({ error: error.message });
    }
    setLoading(false);
  };

  const testBoth = () => {
    testSimpleExtraction();
    testApiExtraction();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">TikTok Thumbnail Extraction Test</h1>
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <label className="block mb-2">TikTok URL:</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@username/video/123456789"
            className="w-full p-3 bg-gray-700 rounded text-white"
          />
          
          <div className="mt-4 space-x-4">
            <button
              onClick={testBoth}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Test Extraction
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Simple Extraction Result:</h2>
            <pre className="bg-gray-900 p-4 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
            
            {result.thumbnail_url && (
              <div className="mt-4">
                <p className="mb-2">Thumbnail Preview (Direct):</p>
                <img 
                  src={result.thumbnail_url} 
                  alt="TikTok thumbnail"
                  className="max-w-md rounded mb-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext fill="%23999" x="200" y="150" text-anchor="middle"%3EDirect Load Failed - CORS%3C/text%3E%3C/svg%3E';
                  }}
                />
                <p className="mb-2">Thumbnail Preview (Proxied):</p>
                <img 
                  src={`/api/proxy-image?url=${encodeURIComponent(result.thumbnail_url)}`} 
                  alt="TikTok thumbnail proxied"
                  className="max-w-md rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext fill="%23999" x="200" y="150" text-anchor="middle"%3EProxy Failed%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}
          </div>
        )}

        {apiResult && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">API Extraction Result:</h2>
            <pre className="bg-gray-900 p-4 rounded overflow-auto">
              {JSON.stringify(apiResult, null, 2)}
            </pre>
            
            {apiResult.thumbnail_url && (
              <div className="mt-4">
                <p className="mb-2">API Thumbnail Preview (Direct):</p>
                <img 
                  src={apiResult.thumbnail_url} 
                  alt="TikTok thumbnail from API"
                  className="max-w-md rounded mb-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext fill="%23999" x="200" y="150" text-anchor="middle"%3EAPI Direct Failed - CORS%3C/text%3E%3C/svg%3E';
                  }}
                />
                <p className="mb-2">API Thumbnail Preview (Proxied):</p>
                <img 
                  src={`/api/proxy-image?url=${encodeURIComponent(apiResult.thumbnail_url)}`} 
                  alt="TikTok thumbnail from API proxied"
                  className="max-w-md rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext fill="%23999" x="200" y="150" text-anchor="middle"%3EAPI Proxy Failed%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-900/20 border border-blue-500 p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Test URLs:</h3>
          <ul className="space-y-2 text-sm">
            <li>https://www.tiktok.com/@zachking/video/7379845235982896393</li>
            <li>https://www.tiktok.com/@mrbeast/video/7382953486677011753</li>
            <li>https://www.tiktok.com/@khaby.lame/video/7380123456789012345</li>
          </ul>
        </div>
      </div>
    </div>
  );
}