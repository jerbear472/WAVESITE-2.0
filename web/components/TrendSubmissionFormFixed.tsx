'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { MetadataExtractor } from '@/lib/metadataExtractor';
import { TrendDuplicateChecker } from '@/lib/trendDuplicateChecker';
import { 
  Link as LinkIcon,
  Upload as UploadIcon,
  Image as ImageIcon,
  Tag as TagIcon,
  Send as SendIcon,
  X as XIcon,
  Clipboard as ClipboardIcon,
  AlertCircle as AlertCircleIcon,
  Check as CheckIcon,
  Loader as LoaderIcon,
  Trash2 as TrashIcon,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  MessageCircle as CommentIcon,
  Share2 as ShareIcon,
  Hash as HashIcon,
  User as UserIcon
} from 'lucide-react';

interface TrendData {
  url: string;
  title: string;
  category: string;
  image?: File | string;
  platform: string;
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  hashtags?: string[];
  thumbnail_url?: string;
  posted_at?: string;
  description?: string;
}

const categories = [
  { id: 'visual_style', label: '🎨 Visual Style', description: 'Aesthetic trends, filters, visual effects' },
  { id: 'audio_music', label: '🎵 Audio/Music', description: 'Songs, sounds, audio clips' },
  { id: 'creator_technique', label: '🎬 Creator Technique', description: 'Filming, editing, storytelling methods' },
  { id: 'meme_format', label: '😂 Meme Format', description: 'Templates, formats, viral concepts' },
  { id: 'product_brand', label: '🛍️ Product/Brand', description: 'Products, brands, commercial trends' },
  { id: 'behavior_pattern', label: '📊 Behavior Pattern', description: 'User behaviors, interaction patterns' }
];

const platforms = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: 'from-black to-gray-800' },
  { id: 'instagram', label: 'Instagram', icon: '📸', color: 'from-purple-500 to-pink-500' },
  { id: 'youtube', label: 'YouTube', icon: '▶️', color: 'from-red-600 to-red-700' },
  { id: 'twitter', label: 'Twitter/X', icon: '🐦', color: 'from-blue-500 to-blue-600' },
  { id: 'other', label: 'Other', icon: '🌐', color: 'from-gray-600 to-gray-700' }
];

interface TrendSubmissionFormProps {
  onClose: () => void;
  onSubmit: (data: TrendData) => Promise<void>;
  initialUrl?: string;
}

export default function TrendSubmissionFormFixed({ onClose, onSubmit, initialUrl = '' }: TrendSubmissionFormProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<TrendData>({
    url: initialUrl,
    title: '',
    category: '',
    platform: '',
    creator_handle: '',
    creator_name: '',
    post_caption: '',
    likes_count: 0,
    comments_count: 0,
    shares_count: 0,
    views_count: 0,
    hashtags: [],
    thumbnail_url: '',
    posted_at: '',
    description: ''
  });

  // Auto-detect platform from URL
  const detectPlatform = (url: string): string => {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    return 'other';
  };

  // Extract metadata when URL changes
  const extractMetadata = async (url: string) => {
    if (!url) return;
    
    setExtractingMetadata(true);
    setError(''); // Clear any previous errors
    try {
      const metadata = await MetadataExtractor.extractFromUrl(url);
      
      setFormData(prev => ({
        ...prev,
        platform: detectPlatform(url),
        title: metadata.title || prev.title,
        creator_handle: metadata.creator_handle || prev.creator_handle,
        creator_name: metadata.creator_name || prev.creator_name,
        post_caption: metadata.post_caption || prev.post_caption,
        likes_count: metadata.likes_count !== undefined ? metadata.likes_count : prev.likes_count,
        comments_count: metadata.comments_count !== undefined ? metadata.comments_count : prev.comments_count,
        shares_count: metadata.shares_count !== undefined ? metadata.shares_count : prev.shares_count,
        views_count: metadata.views_count !== undefined ? metadata.views_count : prev.views_count,
        hashtags: metadata.hashtags || prev.hashtags || [],
        thumbnail_url: metadata.thumbnail_url || prev.thumbnail_url,
        posted_at: metadata.posted_at || prev.posted_at
      }));
      
      // Show success if we got meaningful data
      if (metadata.creator_handle || metadata.post_caption || metadata.likes_count) {
        setSuccess('Successfully extracted post data!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      // Don't show error to user, just log it
    } finally {
      setExtractingMetadata(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation
    if (!formData.likes_count && formData.likes_count !== 0) {
      setError('Likes count is required');
      return;
    }
    if (!formData.comments_count && formData.comments_count !== 0) {
      setError('Comments count is required');
      return;
    }
    if (!formData.views_count && formData.views_count !== 0) {
      setError('Views count is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await onSubmit(formData);
      setSuccess('Trend submitted successfully! 🎉');
      setTimeout(() => onClose(), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit trend');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-slate-800 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-700"
      >
        {/* Fixed Close Button */}
        <button
          onClick={onClose}
          className="fixed top-6 right-6 z-50 p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600 shadow-lg"
          aria-label="Close"
        >
          <XIcon className="w-5 h-5 text-slate-300" />
        </button>
        
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Submit New Trend</h2>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${step >= 1 ? 'text-blue-400' : 'text-slate-500'}`}>Basic Info</span>
            <span className={`text-sm ${step >= 2 ? 'text-blue-400' : 'text-slate-500'}`}>Details</span>
            <span className={`text-sm ${step >= 3 ? 'text-blue-400' : 'text-slate-500'}`}>Review</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              {/* URL Input */}
              <div>
                <label className="block text-slate-200 mb-2 font-medium">
                  Content URL *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => {
                      const url = e.target.value;
                      setFormData(prev => ({ ...prev, url }));
                      if (url) extractMetadata(url);
                    }}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    placeholder="https://tiktok.com/@user/video/..."
                    required
                  />
                  {extractingMetadata && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <LoaderIcon className="w-5 h-5 text-blue-400 animate-spin" />
                    </div>
                  )}
                </div>
                {formData.platform && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-slate-700 rounded-full">
                    <span>{platforms.find(p => p.id === formData.platform)?.icon}</span>
                    <span className="text-sm text-slate-300">
                      {platforms.find(p => p.id === formData.platform)?.label} detected
                    </span>
                  </div>
                )}
              </div>

              {/* Auto-captured Data Display */}
              {(formData.creator_handle || formData.post_caption || formData.likes_count > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4"
                >
                  <h4 className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
                    <CheckIcon className="w-4 h-4" />
                    Auto-captured from URL
                  </h4>
                  <div className="space-y-2">
                    {formData.creator_handle && (
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-300">
                          Creator: <span className="text-white font-medium">{formData.creator_handle}</span>
                          {formData.creator_name && formData.creator_name !== formData.creator_handle && (
                            <span className="text-slate-400"> ({formData.creator_name})</span>
                          )}
                        </span>
                      </div>
                    )}
                    {formData.post_caption && (
                      <div className="flex items-start gap-2">
                        <MessageCircleIcon className="w-4 h-4 text-slate-400 mt-0.5" />
                        <span className="text-sm text-slate-300">
                          Caption: <span className="text-white italic">"{formData.post_caption}"</span>
                        </span>
                      </div>
                    )}
                    {(formData.likes_count > 0 || formData.views_count > 0) && (
                      <div className="flex items-center gap-4 mt-2">
                        {formData.likes_count > 0 && (
                          <span className="text-sm text-slate-300 flex items-center gap-1">
                            <HeartIcon className="w-4 h-4 text-red-400" />
                            {formatNumber(formData.likes_count)}
                          </span>
                        )}
                        {formData.comments_count > 0 && (
                          <span className="text-sm text-slate-300 flex items-center gap-1">
                            <CommentIcon className="w-4 h-4 text-blue-400" />
                            {formatNumber(formData.comments_count)}
                          </span>
                        )}
                        {formData.views_count > 0 && (
                          <span className="text-sm text-slate-300 flex items-center gap-1">
                            <EyeIcon className="w-4 h-4 text-green-400" />
                            {formatNumber(formData.views_count)}
                          </span>
                        )}
                      </div>
                    )}
                    {formData.hashtags && formData.hashtags.length > 0 && (
                      <div className="flex items-start gap-2">
                        <HashIcon className="w-4 h-4 text-slate-400 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {formData.hashtags.map((tag, i) => (
                            <span key={i} className="text-sm text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Title */}
              <div>
                <label className="block text-slate-200 mb-2 font-medium">
                  Trend Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  placeholder="e.g., Dance challenge, Filter effect, Product review..."
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-200 mb-2 font-medium">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  placeholder="Describe what makes this trend interesting..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-slate-200 mb-2 font-medium">
                  Screenshot (Optional)
                </label>
                {!imagePreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-slate-500 transition-colors"
                  >
                    <UploadIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-300">Click to upload image</p>
                    <p className="text-sm text-slate-500 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                ) : (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData(prev => ({ ...prev, image: undefined }));
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600"
                    >
                      <XIcon className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Platform Selection */}
              <div>
                <label className="block text-slate-200 mb-3 font-medium">
                  Platform *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, platform: platform.id }))}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.platform === platform.id
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xl">{platform.icon}</span>
                        <span className="text-sm font-medium text-slate-200">{platform.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-slate-200 mb-3 font-medium">
                  Category *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: category.id }))}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.category === category.id
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-medium text-slate-200 mb-1">{category.label}</div>
                      <div className="text-sm text-slate-400">{category.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Social Media Metadata */}
              <div className="space-y-4 p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-slate-200 font-medium">Post Details</h3>
                  {formData.url && (
                    <span className="text-xs text-slate-400">
                      {extractingMetadata ? 'Extracting data...' : 'Auto-filled from URL'}
                    </span>
                  )}
                </div>
                
                {/* Creator Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-sm mb-1">Creator Handle</label>
                    <input
                      type="text"
                      value={formData.creator_handle || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, creator_handle: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm mb-1">Creator Name</label>
                    <input
                      type="text"
                      value={formData.creator_name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, creator_name: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                      placeholder="Display name"
                    />
                  </div>
                </div>

                {/* Caption */}
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Post Caption</label>
                  <textarea
                    value={formData.post_caption || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, post_caption: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                    placeholder="Original post caption..."
                  />
                </div>

                {/* Engagement Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-300 text-sm mb-1">
                      <HeartIcon className="w-3 h-3 inline mr-1" />Likes *
                    </label>
                    <input
                      type="number"
                      value={formData.likes_count || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, likes_count: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                      placeholder="0"
                      required
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm mb-1">
                      <CommentIcon className="w-3 h-3 inline mr-1" />Comments *
                    </label>
                    <input
                      type="number"
                      value={formData.comments_count || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, comments_count: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                      placeholder="0"
                      required
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm mb-1">
                      <ShareIcon className="w-3 h-3 inline mr-1" />Shares
                    </label>
                    <input
                      type="number"
                      value={formData.shares_count || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, shares_count: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm mb-1">
                      <EyeIcon className="w-3 h-3 inline mr-1" />Views *
                    </label>
                    <input
                      type="number"
                      value={formData.views_count || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, views_count: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                      placeholder="0"
                      required
                      min="0"
                    />
                  </div>
                </div>

                {/* Hashtags */}
                <div>
                  <label className="block text-slate-300 text-sm mb-1">
                    <HashIcon className="w-3 h-3 inline mr-1" />Hashtags
                  </label>
                  <input
                    type="text"
                    value={formData.hashtags?.join(', ') || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      hashtags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                    }))}
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                    placeholder="trending, viral, fyp"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-slate-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Review Your Submission</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 text-sm">Platform</span>
                      <p className="text-white flex items-center gap-2">
                        <span>{platforms.find(p => p.id === formData.platform)?.icon}</span>
                        {platforms.find(p => p.id === formData.platform)?.label}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Category</span>
                      <p className="text-white">{categories.find(c => c.id === formData.category)?.label}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-sm">URL</span>
                    <p className="text-white break-all">{formData.url}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 text-sm">Title</span>
                    <p className="text-white">{formData.title}</p>
                  </div>

                  {formData.description && (
                    <div>
                      <span className="text-slate-400 text-sm">Description</span>
                      <p className="text-white">{formData.description}</p>
                    </div>
                  )}

                  {formData.creator_handle && (
                    <div>
                      <span className="text-slate-400 text-sm">Creator</span>
                      <p className="text-white">
                        {formData.creator_handle}
                        {formData.creator_name && ` (${formData.creator_name})`}
                      </p>
                    </div>
                  )}

                  {(formData.likes_count || formData.comments_count || formData.views_count) ? (
                    <div>
                      <span className="text-slate-400 text-sm">Engagement</span>
                      <div className="flex items-center gap-4 mt-1">
                        {formData.likes_count > 0 && (
                          <span className="text-white flex items-center gap-1">
                            <HeartIcon className="w-4 h-4" />
                            {formatNumber(formData.likes_count)}
                          </span>
                        )}
                        {formData.comments_count > 0 && (
                          <span className="text-white flex items-center gap-1">
                            <CommentIcon className="w-4 h-4" />
                            {formatNumber(formData.comments_count)}
                          </span>
                        )}
                        {formData.views_count > 0 && (
                          <span className="text-white flex items-center gap-1">
                            <EyeIcon className="w-4 h-4" />
                            {formatNumber(formData.views_count)}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {imagePreview && (
                    <div>
                      <span className="text-slate-400 text-sm">Screenshot</span>
                      <img src={imagePreview} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg" />
                    </div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                  <p className="text-green-400 text-sm flex items-center gap-2">
                    <CheckIcon className="w-4 h-4" />
                    You'll earn $0.10 for this submission!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              type="button"
              onClick={() => step > 1 && setStep(step - 1)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                step === 1 
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
              disabled={step === 1}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  // Validate required fields before proceeding
                  if (step === 1 && (!formData.url || !formData.title)) {
                    setError('Please fill in all required fields');
                    return;
                  }
                  if (step === 2) {
                    if (!formData.platform || !formData.category) {
                      setError('Please select platform and category');
                      return;
                    }
                    if (formData.likes_count === undefined || formData.likes_count === null || 
                        formData.comments_count === undefined || formData.comments_count === null ||
                        formData.views_count === undefined || formData.views_count === null) {
                      setError('Please fill in all engagement metrics (likes, comments, views)');
                      return;
                    }
                  }
                  setError('');
                  setStep(step + 1);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Next
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <SendIcon className="w-4 h-4" />
                    Submit Trend
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}