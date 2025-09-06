'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useXPNotification } from '@/contexts/XPNotificationContext';
import { supabase } from '@/lib/supabase';
import { mapCategoryToEnum } from '@/lib/categoryMapper';
import { submitTrend } from '@/lib/submitTrend';
import { 
  Link,
  Send,
  X,
  Loader,
  Check,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Tag,
  Hash,
  FileText,
  Layers,
  Zap,
  Users,
  Globe,
  Activity,
  Brain,
  ArrowRight,
  Heart,
  MessageCircle
} from 'lucide-react';

interface QuickTrendSubmitProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data?: any) => void;
  initialUrl?: string;
}

// Helper function to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export default function QuickTrendSubmit({ isOpen, onClose, onSuccess, initialUrl = '' }: QuickTrendSubmitProps) {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  
  const [url, setUrl] = useState(initialUrl);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Main fields
  const [trendName, setTrendName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('meme');
  const [tags, setTags] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  
  // Additional advanced fields from old SmartTrendSubmission
  const [trendVelocity, setTrendVelocity] = useState('picking_up');
  const [trendSize, setTrendSize] = useState('niche');
  const [audienceAge, setAudienceAge] = useState<string[]>([]);
  const [sentiment, setSentiment] = useState(50);
  const [creatorHandle, setCreatorHandle] = useState('');
  const [viewsCount, setViewsCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [drivingGeneration, setDrivingGeneration] = useState('');
  const [trendOrigin, setTrendOrigin] = useState('');

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Handle initialUrl when modal opens
  useEffect(() => {
    if (initialUrl && isOpen) {
      setUrl(initialUrl);
      if (isValidUrl(initialUrl)) {
        extractThumbnail(initialUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl, isOpen]);

  // Generate catchy trend name based on platform and category
  const generateTrendName = (platform: string, category: string): string => {
    const adjectives = ['Viral', 'Breaking', 'Hot', 'Trending', 'Fresh', 'Wild', 'Epic', 'Crazy'];
    const platformNames = {
      tiktok: 'TikTok',
      instagram: 'IG',
      twitter: 'Twitter',
      youtube: 'YouTube',
      reddit: 'Reddit',
      other: 'Social'
    };
    
    const categoryNames = {
      meme: 'Meme',
      fashion: 'Style',
      food: 'Food',
      music: 'Sound',
      lifestyle: 'Life',
      tech: 'Tech',
      finance: 'Finance',
      sports: 'Sports',
      political: 'Political',
      cars: 'Cars',
      animals: 'Pet',
      travel: 'Travel',
      education: 'Edu',
      health: 'Health',
      other: 'Trend'
    };
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const plat = platformNames[platform as keyof typeof platformNames] || 'Social';
    const cat = categoryNames[category as keyof typeof categoryNames] || 'Trend';
    
    return `${adj} ${plat} ${cat}`;
  };

  // Extract thumbnail and metadata when URL changes
  const extractThumbnail = async (trendUrl: string) => {
    if (!isValidUrl(trendUrl)) return;
    
    try {
      const response = await fetch('/api/extract-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trendUrl })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.thumbnail_url) {
          setThumbnailUrl(data.thumbnail_url);
        }
        
        // Auto-capture metadata
        if (data.metadata) {
          // Set creator handle if available
          if (data.metadata.author_name) {
            setCreatorHandle(data.metadata.author_name);
          }
          
          // Set description/caption if available and not already set
          if (data.metadata.title && !description) {
            setDescription(data.metadata.title);
          }
          
          // Extract hashtags from title/caption
          if (data.metadata.title) {
            const hashtagMatches = data.metadata.title.match(/#\w+/g);
            if (hashtagMatches && !tags) {
              setTags(hashtagMatches.map((tag: string) => tag.slice(1)).join(', '));
            }
          }
        }
        
        // Also extract stats if available
        if (data.views_count) setViewsCount(data.views_count);
        if (data.likes_count) setLikesCount(data.likes_count);
        if (data.comments_count) setCommentsCount(data.comments_count);
      }
    } catch (err) {
      console.log('Could not fetch thumbnail:', err);
    }
  };

  const handleSubmit = async () => {
    if (!url.trim() || !user) return;
    
    setSubmitting(true);
    setError('');
    
    try {
      // Extract platform from URL
      const platform = detectPlatform(url);
      
      // Generate a catchy name if not provided
      const finalTrendName = trendName.trim() || generateTrendName(platform, category);
      
      // Process tags if provided
      const tagArray = tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      
      // Build submission data for submitTrend function
      const submissionData = {
        url: url,
        title: finalTrendName,
        description: description.trim() || finalTrendName,
        category: mapCategoryToEnum(category) || 'meme_format',
        platform: platform,
        trendVelocity: trendVelocity || undefined,
        trendSize: trendSize || undefined,
        sentiment: sentiment || 50,
        audienceAge: audienceAge.length > 0 ? audienceAge : undefined,
        thumbnail_url: thumbnailUrl || undefined,
        creator_handle: creatorHandle || undefined,
        views_count: viewsCount || 0,
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0,
        hashtags: tagArray.length > 0 ? tagArray : undefined,
        wave_score: sentiment || 50
      };
      
      console.log('Submitting trend via submitTrend function:', submissionData);
      
      // Use the proper submitTrend function with timeouts and error handling
      const result = await submitTrend(user.id, submissionData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit trend');
      }
      
      console.log('Trend submitted successfully:', result.submission);
      
      // XP notification
      if (result.earnings) {
        showXPNotification(result.earnings, `Trend submitted! +${result.earnings} XP`);
      }
      
      // Show success immediately
      setSuccess(true);
      
      // After a short delay, call onSuccess
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 2000);
      
    } catch (err: any) {
      console.error('Submission error:', err);
      const errorMessage = err.message || err.error_description || 'Failed to submit. Try again.';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setSuccess(false);
    setError('');
    setShowAdvanced(false);
    setTrendName('');
    setDescription('');
    setCategory('meme');
    setTags('');
    setThumbnailUrl('');
    setTrendVelocity('picking_up');
    setTrendSize('niche');
    setSentiment(50);
    setDrivingGeneration('');
    setTrendOrigin('');
    onClose();
  };

  const detectPlatform = (url: string): string => {
    if (url.includes('tiktok')) return 'tiktok';
    if (url.includes('instagram')) return 'instagram';
    if (url.includes('twitter') || url.includes('x.com')) return 'twitter';
    if (url.includes('youtube')) return 'youtube';
    if (url.includes('reddit')) return 'reddit';
    return 'other';
  };

  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
      <AnimatePresence>
        {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>

          {/* Success State */}
          {success ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-6 py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-10 h-10 text-green-600" />
              </motion.div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Trend Spotted!</h3>
              <p className="text-gray-600 mb-1">Your trend has been submitted successfully</p>
              <p className="text-sm text-green-600 font-medium">+10 XP earned</p>
              
              <div className="mt-8 space-y-3">
                <button
                  onClick={() => {
                    onSuccess?.({ continueToAnalysis: true, url, title: trendName });
                    handleClose();
                  }}
                  className="w-full py-3 rounded-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Brain className="w-5 h-5" />
                  <span>Continue to AI Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => {
                    onSuccess?.();
                    handleClose();
                  }}
                  className="w-full py-3 rounded-lg font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col flex-1">
              {/* Header with Progress Bar */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Spot a Trend</h2>
                </div>
                <p className="text-sm text-gray-600">
                  Share what's trending right now - optional details available
                </p>
                
                {/* WaveSight Blue Progress Bar */}
                <div className="mt-4">
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                      animate={{ 
                        width: `${(() => {
                          let progress = 10; // Base progress
                          if (url && isValidUrl(url)) progress += 35;
                          if (trendName) progress += 35;
                          if (thumbnailUrl) progress += 10;
                          if (showAdvanced && (description || tags)) progress += 10;
                          return Math.min(progress, 100);
                        })()}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">Quick Submit</span>
                    <span className="text-xs text-blue-600 font-medium">
                      {url && trendName ? 'Ready to submit!' : url ? 'Add title' : 'Paste URL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Input Fields - Scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                <div className="space-y-4 pb-8">
                {/* Step 1: URL Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trend URL <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        // Extract thumbnail when URL is valid
                        if (isValidUrl(e.target.value)) {
                          extractThumbnail(e.target.value);
                        }
                      }}
                      placeholder="https://tiktok.com/@user/video/..."
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      autoFocus
                    />
                  </div>
                  
                  {/* Thumbnail and Metadata Preview */}
                  {(thumbnailUrl || creatorHandle || viewsCount > 0) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex gap-4">
                        {thumbnailUrl && (
                          <img 
                            src={thumbnailUrl}
                            alt="Trend preview"
                            className="w-20 h-20 object-cover rounded-lg shadow-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              setThumbnailUrl('');
                            }}
                          />
                        )}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 text-green-600">
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">Metadata captured automatically</span>
                          </div>
                          
                          {/* Creator info */}
                          {creatorHandle && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700">@{creatorHandle.replace('@', '')}</span>
                            </div>
                          )}
                          
                          {/* Stats */}
                          {(viewsCount > 0 || likesCount > 0 || commentsCount > 0) && (
                            <div className="flex gap-4 text-sm">
                              {viewsCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <Activity className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600">{formatNumber(viewsCount)} views</span>
                                </div>
                              )}
                              {likesCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <Heart className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600">{formatNumber(likesCount)}</span>
                                </div>
                              )}
                              {commentsCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600">{formatNumber(commentsCount)}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Tags preview */}
                          {tags && (
                            <div className="flex flex-wrap gap-1">
                              {tags.split(',').slice(0, 5).map((tag, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-white/70 rounded-full text-blue-600 border border-blue-200">
                                  #{tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Step 2: Title Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Give it a catchy title (optional)
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={trendName}
                      onChange={(e) => setTrendName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && url && trendName.trim()) {
                          handleSubmit();
                        }
                      }}
                      placeholder="e.g., Crying Cat Phone Meme Goes Viral"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  {!trendName && url && isValidUrl(url) && (
                    <button
                      type="button"
                      onClick={() => {
                        const platform = detectPlatform(url);
                        setTrendName(generateTrendName(platform, category));
                      }}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Generate a title for me →
                    </button>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Advanced Options Toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-gray-600 hover:text-gray-700 text-sm font-medium transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showAdvanced ? 'Hide' : 'Add'} Optional Details
                </button>

                {/* Advanced Fields */}
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      {/* Trend Name */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Trend Name</label>
                        <div className="relative">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="text"
                            value={trendName}
                            onChange={(e) => setTrendName(e.target.value)}
                            placeholder="e.g., Crying Cat Phone Meme"
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                          />
                        </div>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-2 font-medium">📂 Category</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'meme', label: '😂 Meme/Humor' },
                            { value: 'fashion', label: '👗 Fashion/Beauty' },
                            { value: 'food', label: '🍔 Food/Drink' },
                            { value: 'music', label: '🎵 Music/Dance' },
                            { value: 'lifestyle', label: '✨ Lifestyle' },
                            { value: 'tech', label: '💻 Tech/Gaming' },
                            { value: 'finance', label: '💰 Finance/Crypto' },
                            { value: 'sports', label: '⚽ Sports/Fitness' },
                            { value: 'political', label: '🗳️ Political/Social' },
                            { value: 'cars', label: '🚗 Cars & Machines' },
                            { value: 'animals', label: '🐾 Animals & Pets' },
                            { value: 'travel', label: '✈️ Travel & Places' },
                            { value: 'education', label: '📚 Education' },
                            { value: 'health', label: '💪 Health & Wellness' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setCategory(option.value)}
                              className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                                category === option.value
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Tags (comma-separated)</label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="funny, relatable, gen-z"
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Description</label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What makes this trend special?"
                            rows={3}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm resize-none"
                          />
                        </div>
                      </div>

                      {/* Trend Lifecycle */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-2 font-medium">📊 Trend Lifecycle</label>
                        <div className="space-y-2">
                          {[
                            { value: 'just_starting', label: '🌱 Just Starting', desc: 'Brand new, very few people know' },
                            { value: 'picking_up', label: '📈 Picking Up', desc: 'Gaining traction, growing steadily' },
                            { value: 'viral', label: '🚀 Going Viral', desc: 'Explosive growth, spreading everywhere' },
                            { value: 'saturated', label: '⚡ Saturated', desc: 'Peak reached, maximum visibility' },
                            { value: 'declining', label: '📉 Declining', desc: 'Losing momentum, past its prime' },
                            { value: 'here_to_stay', label: '🧬 Here to Stay', desc: 'Becoming part of culture permanently' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setTrendVelocity(option.value)}
                              className={`w-full p-3 rounded-lg border transition-all text-left ${
                                trendVelocity === option.value
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-lg">{option.label.split(' ')[0]}</span>
                                <div className="flex-1">
                                  <div className="font-medium text-xs text-gray-800">{option.label.split(' ').slice(1).join(' ')}</div>
                                  <div className="text-xs text-gray-600 mt-0.5">{option.desc}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Trend Size */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-2 font-medium">🎯 Trend Size</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'micro', label: '🔬 Micro', desc: '<10K views' },
                            { value: 'niche', label: '🎯 Niche', desc: '10K-100K' },
                            { value: 'viral', label: '🔥 Viral', desc: '100K-1M' },
                            { value: 'mega', label: '💥 Mega', desc: '1M-10M' },
                            { value: 'global', label: '🌍 Global', desc: '10M+' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setTrendSize(option.value)}
                              className={`p-2.5 rounded-lg border transition-all text-left ${
                                trendSize === option.value
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="text-xs font-medium text-gray-800">{option.label}</div>
                              <div className="text-xs text-gray-600 mt-0.5">{option.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sentiment Slider */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-2 font-medium">💭 How do you feel about this trend?</label>
                        <div className="flex items-center gap-3">
                          <span className="text-xl">😴</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={sentiment}
                            onChange={(e) => setSentiment(parseInt(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, #ef4444 0%, #f59e0b 25%, #10b981 50%, #3b82f6 75%, #8b5cf6 100%)`
                            }}
                          />
                          <span className="text-xl">🔥</span>
                        </div>
                        <div className="text-center mt-1">
                          <span className="text-xs text-gray-500">Sentiment: {sentiment}%</span>
                        </div>
                      </div>

                      {/* Who's Driving */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-2 font-medium">👥 Who's driving this trend?</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'gen_alpha', label: '👶 Gen Alpha', desc: '2010+' },
                            { value: 'gen_z', label: '📱 Gen Z', desc: '1997-2009' },
                            { value: 'millennials', label: '💻 Millennials', desc: '1981-1996' },
                            { value: 'gen_x', label: '📼 Gen X', desc: '1965-1980' },
                            { value: 'boomers', label: '📺 Boomers', desc: '1946-1964' },
                            { value: '', label: '🌍 All Ages', desc: 'Everyone' }
                          ].map((option) => (
                            <button
                              key={option.value || 'all'}
                              onClick={() => setDrivingGeneration(option.value)}
                              className={`p-2.5 rounded-lg border transition-all text-left ${
                                drivingGeneration === option.value
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="text-xs font-medium text-gray-800">{option.label}</div>
                              <div className="text-xs text-gray-600 mt-0.5">{option.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Trend Origin */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-2 font-medium">🌟 Origin Story</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'organic', label: '🌿 Organic', desc: 'Regular users' },
                            { value: 'influencer', label: '⭐ Influencer', desc: 'Creator started' },
                            { value: 'brand', label: '🏢 Brand', desc: 'Marketing campaign' },
                            { value: 'ai_generated', label: '🤖 AI Generated', desc: 'Created by AI' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setTrendOrigin(option.value)}
                              className={`p-2.5 rounded-lg border transition-all text-left ${
                                trendOrigin === option.value
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="text-xs font-medium text-gray-800">{option.label}</div>
                              <div className="text-xs text-gray-600 mt-0.5">{option.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
              </div>

              {/* Submit Button Section */}
              <div className="px-6 pb-6 pt-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={handleSubmit}
                  disabled={!isValidUrl(url) || submitting}
                  className={`w-full py-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    isValidUrl(url) && !submitting
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Analyzing and Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span className="font-semibold">Quick Submit</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Info Text */}
                {!url && (
                  <div className="text-center py-2">
                    <p className="text-xs text-gray-500">
                      Paste a URL from TikTok, Instagram, YouTube, or X to get started
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}