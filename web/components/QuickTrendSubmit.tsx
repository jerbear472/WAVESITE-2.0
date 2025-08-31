'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Link, 
  Sparkles, 
  TrendingUp,
  Check,
  X,
  Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { submitTrendInstant } from '@/lib/submitTrendInstant';
import SubmissionProgress from './SubmissionProgress';

export default function QuickTrendSubmit() {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('lifestyle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const categories = [
    { value: 'technology', label: '💻 Tech', color: 'from-blue-500 to-cyan-500' },
    { value: 'fashion', label: '👗 Fashion', color: 'from-pink-500 to-purple-500' },
    { value: 'food', label: '🍔 Food', color: 'from-orange-500 to-red-500' },
    { value: 'entertainment', label: '🎬 Entertainment', color: 'from-purple-500 to-pink-500' },
    { value: 'lifestyle', label: '✨ Lifestyle', color: 'from-green-500 to-teal-500' },
    { value: 'sports', label: '⚽ Sports', color: 'from-red-500 to-orange-500' },
    { value: 'gaming', label: '🎮 Gaming', color: 'from-indigo-500 to-purple-500' },
    { value: 'music', label: '🎵 Music', color: 'from-purple-500 to-blue-500' },
  ];

  const handleSubmit = async () => {
    if (!user) return;
    if (!title && !url) {
      alert('Please provide at least a title or URL');
      return;
    }

    setIsSubmitting(true);

    const result = await submitTrendInstant(user.id, {
      url,
      title,
      description,
      category,
      platform: detectPlatform(url)
    });

    if (result.success && result.submissionId) {
      setSubmissionId(result.submissionId);
      
      // Show success immediately
      setTimeout(() => {
        setShowSuccess(true);
      }, 100);
    } else {
      alert(result.message);
      setIsSubmitting(false);
    }
  };

  const detectPlatform = (url: string): string => {
    if (!url) return 'unknown';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('reddit.com')) return 'reddit';
    return 'web';
  };

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setDescription('');
    setCategory('lifestyle');
    setSubmissionId(null);
    setIsSubmitting(false);
    setShowSuccess(false);
  };

  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 
                   border border-green-500/30 rounded-2xl p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Check className="w-10 h-10 text-white" />
        </motion.div>
        
        <h3 className="text-2xl font-bold text-white mb-2">
          Trend Submitted! 🎉
        </h3>
        <p className="text-gray-300 mb-6">
          Your trend is being processed. You earned XP!
        </p>

        {submissionId && (
          <SubmissionProgress 
            submissionId={submissionId}
            onComplete={() => {
              setTimeout(resetForm, 1000);
            }}
          />
        )}

        <button
          onClick={resetForm}
          className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 
                   rounded-xl transition-colors text-white font-medium
                   flex items-center gap-2 mx-auto"
        >
          <Plus className="w-5 h-5" />
          Submit Another
        </button>
      </motion.div>
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-400" />
          Quick Trend Submit
        </h2>
        <p className="text-gray-400">
          Spot a trend in seconds - we'll handle the rest!
        </p>
      </div>

      {/* URL Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Trend URL (Optional)
        </label>
        <div className="relative">
          <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 
                     rounded-xl text-white placeholder-gray-500 focus:outline-none 
                     focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Title Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          What's the trend? <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Silent luxury fashion taking over..."
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 
                   rounded-xl text-white placeholder-gray-500 focus:outline-none 
                   focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Quick Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Quick description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What makes this trending?"
          rows={2}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 
                   rounded-xl text-white placeholder-gray-500 focus:outline-none 
                   focus:border-blue-500 transition-colors resize-none"
        />
      </div>

      {/* Category Pills */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Category
        </label>
        <div className="grid grid-cols-4 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${category === cat.value 
                  ? 'bg-gradient-to-r ' + cat.color + ' text-white shadow-lg scale-105' 
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }
              `}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || (!title && !url)}
        className={`
          w-full py-4 rounded-xl font-bold text-white transition-all
          flex items-center justify-center gap-3
          ${isSubmitting || (!title && !url)
            ? 'bg-gray-700 cursor-not-allowed opacity-50'
            : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg'
          }
        `}
      >
        {isSubmitting ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Submit Trend
          </>
        )}
      </button>

      {/* Status Display */}
      {submissionId && !showSuccess && (
        <div className="mt-4">
          <SubmissionProgress 
            submissionId={submissionId}
            onComplete={() => setShowSuccess(true)}
          />
        </div>
      )}
    </div>
  );
}