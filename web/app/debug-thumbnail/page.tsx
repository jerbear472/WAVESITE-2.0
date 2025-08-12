'use client';

import { useState } from 'react';

export default function DebugThumbnailPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testThumbnail = async () => {
    if (!url) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/debug-thumbnail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      setResult(data);
      
      // Also log to console for debugging
      console.log('Debug result:', data);
      
    } catch (error) {
      console.error('Debug error:', error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testUrls = [
    { label: 'TikTok', url: 'https://www.tiktok.com/@zachking/video/7234567890123456789' },
    { label: 'YouTube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { label: 'Instagram', url: 'https://www.instagram.com/p/ABC123/' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Debug Thumbnail Extraction (Vercel)</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Test URL:</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Paste a social media URL..."
            />
          </div>
          
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={testThumbnail}
              disabled={loading || !url}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Testing...' : '🧪 Test Extraction'}
            </button>
            
            {testUrls.map((test) => (
              <button
                key={test.label}
                onClick={() => setUrl(test.url)}
                className="px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-xs"
              >
                {test.label}
              </button>
            ))}
          </div>
        </div>

        {result && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Results:</h2>
            
            {result.error ? (
              <div className="text-red-400">
                <p className="font-semibold">❌ Error:</p>
                <p>{result.error}</p>
                {result.details && <p className="text-sm mt-2">Details: {result.details}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Environment Info */}
                <div className="bg-gray-700 rounded p-4">
                  <h3 className="font-semibold mb-2">📍 Environment:</h3>
                  <div className="text-sm space-y-1">
                    <p>Node Env: {result.environment?.nodeEnv || 'Not set'}</p>
                    <p>Vercel: {result.environment?.vercel || 'Not on Vercel'}</p>
                    <p>Vercel Env: {result.environment?.vercelEnv || 'Not set'}</p>
                    <p>Region: {result.environment?.region || 'Not set'}</p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-gray-700 rounded p-4">
                  <h3 className="font-semibold mb-2">📊 Extracted Metadata:</h3>
                  <div className="text-sm space-y-1">
                    <p>Platform: {result.metadata?.platform || 'Unknown'}</p>
                    <p>Creator: {result.metadata?.creator_handle || 'Not found'}</p>
                    <p>Thumbnail URL: {result.metadata?.thumbnail_url ? 
                      <span className="text-green-400">✅ Found</span> : 
                      <span className="text-red-400">❌ Not found</span>
                    }</p>
                  </div>
                </div>

                {/* Thumbnail Status */}
                {result.metadata?.thumbnail_url && (
                  <div className="bg-gray-700 rounded p-4">
                    <h3 className="font-semibold mb-2">🖼️ Thumbnail Status:</h3>
                    <div className="space-y-2">
                      <p className="text-sm">
                        Accessible from server: {result.thumbnailAccessible ? 
                          <span className="text-green-400">✅ Yes</span> : 
                          <span className="text-red-400">❌ No</span>
                        }
                      </p>
                      {result.thumbnailError && (
                        <p className="text-sm text-red-400">Error: {result.thumbnailError}</p>
                      )}
                      <p className="text-xs text-gray-400 break-all">
                        URL: {result.metadata.thumbnail_url}
                      </p>
                      
                      {/* Try to display the thumbnail */}
                      <div className="mt-4">
                        <p className="text-sm mb-2">Preview (if accessible from browser):</p>
                        <img 
                          src={result.metadata.thumbnail_url}
                          alt="Thumbnail test"
                          className="w-64 h-48 object-cover border border-gray-600 rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'w-64 h-48 bg-gray-700 border border-red-500 rounded flex items-center justify-center text-red-400';
                            errorDiv.textContent = '❌ Failed to load in browser';
                            target.parentNode?.appendChild(errorDiv);
                          }}
                          onLoad={() => {
                            console.log('✅ Thumbnail loaded successfully in browser');
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Raw JSON */}
                <details className="bg-gray-700 rounded p-4">
                  <summary className="cursor-pointer font-semibold">📋 Raw JSON Response</summary>
                  <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-400 mb-2">🚀 How to test on Vercel:</h3>
          <ol className="text-sm space-y-1 text-yellow-200">
            <li>1. Deploy this to Vercel (git push)</li>
            <li>2. Visit: your-app.vercel.app/debug-thumbnail</li>
            <li>3. Test with real social media URLs</li>
            <li>4. Check if thumbnails are extracted and accessible</li>
            <li>5. Look at Vercel function logs for server-side debugging</li>
          </ol>
        </div>
      </div>
    </div>
  );
}