'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Check, AlertCircle } from 'lucide-react';

interface TrendSubmissionFormSimpleProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialUrl?: string;
}

export default function TrendSubmissionFormSimple({ onClose, onSubmit, initialUrl = '' }: TrendSubmissionFormSimpleProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    url: initialUrl,
    trendName: '',
    explanation: '',
    platform: 'tiktok',
    categories: ['other'],
    ageRanges: ['Gen Z (15-24)'],
    moods: ['funny'],
    spreadSpeed: 'picking_up',
    motivation: 'Entertainment and humor',
    subcultures: [],
    firstSeen: 'today',
    otherPlatforms: [],
    brandAdoption: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.trendName || !formData.url || !formData.explanation) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      console.error('Form submission error:', err);
      setError(err.message || 'Failed to submit trend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-bold mb-6">Submit New Trend</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trend URL *
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trend Name *
            </label>
            <input
              type="text"
              value={formData.trendName}
              onChange={(e) => setFormData({ ...formData, trendName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Dance Challenge, Meme Format"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Explanation *
            </label>
            <textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              placeholder="Describe what this trend is about..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="twitter">Twitter/X</option>
              <option value="youtube">YouTube</option>
              <option value="reddit">Reddit</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spread Speed
            </label>
            <select
              value={formData.spreadSpeed}
              onChange={(e) => setFormData({ ...formData, spreadSpeed: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="viral">🚀 Already Viral</option>
              <option value="picking_up">📈 Picking Up Steam</option>
              <option value="just_starting">🌱 Just Starting</option>
              <option value="saturated">😴 Saturated</option>
              <option value="declining">📉 Declining</option>
            </select>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Submit Trend
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}