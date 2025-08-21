'use client';

import { useState } from 'react';

interface SmartTrendSubmissionProps {
  onClose: () => void;
  onSubmit?: (data: any) => Promise<void>;
  initialUrl?: string;
}

export default function SmartTrendSubmission(props: SmartTrendSubmissionProps) {
  const { onClose, onSubmit: customSubmit, initialUrl = '' } = props;
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState(initialUrl);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (customSubmit) {
        await customSubmit({ url, title: 'Trend submission', category: 'meme' });
      }
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-2xl max-w-3xl w-full p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">Submit Trend (Simplified)</h2>
        
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste TikTok, Instagram, or other trend URL..."
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none mb-4"
        />
        
        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-gray-300"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={loading || !url}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-all text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Trend'}
          </button>
        </div>
      </div>
    </div>
  );
}