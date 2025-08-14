'use client';

import { useState } from 'react';

export default function TestTikTokAPI() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testExtraction = async () => {
    if (!url) {
      setError('Please enter a TikTok URL');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/extract-tiktok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to extract TikTok data');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">TikTok API Extraction Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            TikTok URL
          </label>
          <div className="flex gap-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@username/video/1234567890"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={testExtraction}
              disabled={loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Extracting...' : 'Extract'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Extraction Result</h2>
            
            {result.success ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Metadata:</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Creator Handle</dt>
                        <dd className="mt-1 text-sm text-gray-900">{result.data.creator_handle || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Creator Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{result.data.creator_name || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Video ID</dt>
                        <dd className="mt-1 text-sm text-gray-900">{result.data.video_id || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Caption</dt>
                        <dd className="mt-1 text-sm text-gray-900">{result.data.post_caption || 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {result.data.thumbnail_url && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Thumbnail:</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <img 
                        src={result.data.thumbnail_url} 
                        alt="TikTok thumbnail"
                        className="max-w-md mx-auto rounded-lg shadow-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-video.png';
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-2 text-center break-all">
                        {result.data.thumbnail_url}
                      </p>
                    </div>
                  </div>
                )}

                {result.data.note && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                    <p className="text-sm text-yellow-800">{result.data.note}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-red-700">Extraction failed</p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium text-gray-700 mb-2">Raw Response:</h3>
              <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}