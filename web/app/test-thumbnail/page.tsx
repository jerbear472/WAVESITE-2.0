'use client';

import { useState } from 'react';

export default function TestThumbnail() {
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  
  const extractThumbnail = () => {
    console.log('Testing URL:', url);
    
    if (url.includes('tiktok.com')) {
      const videoIdMatch = url.match(/video\/(\d+)/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        const thumbnail = `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-obj.jpg`;
        console.log('Extracted thumbnail:', thumbnail);
        setThumbnailUrl(thumbnail);
      }
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = null;
      if (url.includes('youtube.com')) {
        const match = url.match(/[?&]v=([^&]+)/);
        if (match) videoId = match[1];
      } else if (url.includes('youtu.be')) {
        const match = url.match(/youtu\.be\/([^?]+)/);
        if (match) videoId = match[1];
      }
      if (videoId) {
        const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        console.log('Extracted thumbnail:', thumbnail);
        setThumbnailUrl(thumbnail);
      }
    }
  };
  
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Thumbnail Extraction</h1>
      
      <div className="space-y-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste TikTok or YouTube URL"
          className="w-full p-2 border rounded bg-gray-800 text-white"
        />
        
        <button
          onClick={extractThumbnail}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Extract Thumbnail
        </button>
        
        {thumbnailUrl && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Thumbnail URL: {thumbnailUrl}</p>
            <img 
              src={thumbnailUrl} 
              alt="Thumbnail"
              className="w-full max-w-md border border-gray-600 rounded"
              onError={(e) => {
                console.error('Image failed to load');
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext x="200" y="150" text-anchor="middle" fill="%23999"%3EThumbnail failed to load%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}