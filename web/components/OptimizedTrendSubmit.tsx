'use client';

import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Link, TrendingUp, Sparkles, Check, X,
  Zap, Globe, Music, Camera, Hash, Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { submitTrendInstant } from '@/lib/submitTrendInstant';
import SubmissionProgress from './SubmissionProgress';
import { useXPNotification } from '@/contexts/XPNotificationContext';

// Memoized category selector to prevent re-renders
const CategorySelector = memo(({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (val: string) => void;
}) => {
  const categories = [
    { id: 'technology', icon: '💻', label: 'Tech' },
    { id: 'fashion', icon: '👗', label: 'Fashion' },
    { id: 'food', icon: '🍔', label: 'Food' },
    { id: 'entertainment', icon: '🎬', label: 'Entertainment' },
    { id: 'lifestyle', icon: '✨', label: 'Lifestyle' },
    { id: 'sports', icon: '⚽', label: 'Sports' },
    { id: 'gaming', icon: '🎮', label: 'Gaming' },
    { id: 'music', icon: '🎵', label: 'Music' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`
            px-3 py-2 rounded-lg text-sm font-medium transition-all
            ${value === cat.id 
              ? 'bg-blue-500 text-white scale-105' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          <span className="mr-1">{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
});

CategorySelector.displayName = 'CategorySelector';

// Platform detection component
const PlatformButtons = memo(({ 
  onSelectUrl 
}: { 
  onSelectUrl: (url: string) => void;
}) => {
  const platforms = [
    { name: 'TikTok', icon: '🎵', color: 'from-pink-500 to-purple-500', url: 'https://tiktok.com' },
    { name: 'Instagram', icon: '📸', color: 'from-purple-500 to-pink-500', url: 'https://instagram.com' },
    { name: 'X/Twitter', icon: '🐦', color: 'from-blue-400 to-blue-600', url: 'https://x.com' },
    { name: 'YouTube', icon: '📺', color: 'from-red-500 to-red-700', url: 'https://youtube.com' },
    { name: 'Reddit', icon: '🔥', color: 'from-orange-500 to-red-500', url: 'https://reddit.com' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {platforms.map(platform => (
        <button
          key={platform.name}
          onClick={() => onSelectUrl(platform.url)}
          className={`
            flex-shrink-0 px-4 py-2 rounded-lg
            bg-gradient-to-r ${platform.color}
            text-white font-medium text-sm
            hover:scale-105 transition-transform
          `}
        >
          <span className="mr-1">{platform.icon}</span>
          {platform.name}
        </button>
      ))}
    </div>
  );
});

PlatformButtons.displayName = 'PlatformButtons';

interface OptimizedTrendSubmitProps {
  onClose?: () => void;
  initialUrl?: string;
}

export default function OptimizedTrendSubmit({ 
  onClose, 
  initialUrl = '' 
}: OptimizedTrendSubmitProps) {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  
  // Minimal state - only essentials
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('lifestyle');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Debounced URL setter
  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    // Auto-detect platform from URL
    if (value.includes('tiktok')) setCategory('entertainment');
    else if (value.includes('instagram')) setCategory('lifestyle');
    else if (value.includes('youtube')) setCategory('entertainment');
  }, []);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!user?.id) {
      setError('Please log in to submit trends');
      return;
    }

    if (!title && !url) {
      setError('Please provide a title or URL');
      return;
    }

    setError('');
    
    // Instant submission
    const result = await submitTrendInstant(user.id, {
      url,
      title: title || 'Trending content',
      category,
      platform: detectPlatform(url)
    });

    if (result.success && result.submissionId) {
      setSubmissionId(result.submissionId);
      setIsSuccess(true);
      
      // Show XP notification
      showXPNotification(
        10,
        'Trend submitted!',
        'submission',
        '🚀 Instant',
        'Processing in background...'
      );
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose?.();
      }, 3000);
    } else {
      setError(result.message);
    }
  }, [user, url, title, category, showXPNotification, onClose]);

  const detectPlatform = (url: string): string => {
    if (!url) return 'unknown';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('tiktok')) return 'tiktok';
    if (lowerUrl.includes('instagram')) return 'instagram';
    if (lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) return 'twitter';
    if (lowerUrl.includes('youtube')) return 'youtube';
    if (lowerUrl.includes('reddit')) return 'reddit';
    return 'web';
  };

  // Success state
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 shadow-xl text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Check className="w-10 h-10 text-white" />
        </motion.div>
        
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          Submitted! 🎉
        </h3>
        <p className="text-gray-600 mb-4">
          Your trend is being processed
        </p>

        {submissionId && (
          <SubmissionProgress 
            submissionId={submissionId}
            onComplete={() => onClose?.()}
          />
        )}
      </motion.div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Spot a Trend
            </h2>
            <p className="text-blue-100 mt-1">Quick and easy submission</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Platform buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick platform links
          </label>
          <PlatformButtons onSelectUrl={handleUrlChange} />
        </div>

        {/* URL Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL (optional)
          </label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="Paste link here..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What's trending? <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Describe the trend..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <CategorySelector value={category} onChange={setCategory} />
        </div>

        {/* Error display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!title && !url}
          className={`
            w-full py-4 rounded-lg font-bold text-white transition-all
            flex items-center justify-center gap-2
            ${!title && !url
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg'
            }
          `}
        >
          <Send className="w-5 h-5" />
          Submit Instantly
        </button>

        {/* Info */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Zap className="w-4 h-4" />
          <span>Instant submission with background processing</span>
        </div>
      </div>
    </div>
  );
}