'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { MetadataExtractor } from '@/lib/metadataExtractorSafe';
import { 
  Link as LinkIcon,
  Camera as CameraIcon,
  Hash as HashIcon,
  Send as SendIcon,
  X as XIcon,
  Clipboard as ClipboardIcon,
  Check as CheckIcon,
  Loader as LoaderIcon,
  ChevronDown as ChevronDownIcon
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
}

const categories = [
  { id: 'visual_style', label: '🎨 Visual Style', emoji: '🎨' },
  { id: 'audio_music', label: '🎵 Audio/Music', emoji: '🎵' },
  { id: 'creator_technique', label: '🎬 Creator Technique', emoji: '🎬' },
  { id: 'meme_format', label: '😂 Meme Format', emoji: '😂' },
  { id: 'product_brand', label: '🛍️ Product/Brand', emoji: '🛍️' },
  { id: 'behavior_pattern', label: '📊 Behavior Pattern', emoji: '📊' }
];

const platforms = [
  { id: 'tiktok', label: 'TikTok', color: 'bg-black', emoji: '🎵' },
  { id: 'instagram', label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500', emoji: '📸' },
  { id: 'youtube', label: 'YouTube', color: 'bg-red-600', emoji: '▶️' },
  { id: 'twitter', label: 'Twitter/X', color: 'bg-black', emoji: '🐦' },
  { id: 'other', label: 'Other', color: 'bg-gray-600', emoji: '🌐' }
];

interface MobileTrendSubmissionProps {
  onClose: () => void;
  onSubmit: (data: TrendData) => Promise<void>;
}

export default function MobileTrendSubmission({ onClose, onSubmit }: MobileTrendSubmissionProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<TrendData>({
    url: '',
    title: '',
    category: '',
    platform: ''
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect clipboard content on mount
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText && isValidUrl(clipboardText)) {
            setFormData(prev => ({ ...prev, url: clipboardText }));
            extractMetadataFromUrl(clipboardText);
          }
        }
      } catch (error) {
        console.log('Clipboard access not available');
      }
    };
    checkClipboard();
  }, []);

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return string.includes('tiktok.com') || 
             string.includes('instagram.com') || 
             string.includes('youtube.com') || 
             string.includes('twitter.com') || 
             string.includes('x.com');
    } catch {
      return false;
    }
  };

  const extractMetadataFromUrl = async (url: string) => {
    setExtractingMetadata(true);
    try {
      const extractedData = await MetadataExtractor.extractFromUrl(url);
      
      // Detect platform from URL
      let platform = 'other';
      if (url.includes('tiktok.com')) platform = 'tiktok';
      else if (url.includes('instagram.com')) platform = 'instagram';
      else if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube';
      else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';
      
      setFormData(prev => ({
        ...prev,
        platform: platform,
        title: prev.title || extractedData.title || '',
        creator_handle: extractedData.creator_handle || '',
        creator_name: extractedData.creator_name || '',
        post_caption: extractedData.post_caption || '',
        likes_count: extractedData.likes_count || 0,
        comments_count: extractedData.comments_count || 0,
        shares_count: extractedData.shares_count || 0,
        views_count: extractedData.views_count || 0,
        hashtags: extractedData.hashtags || []
      }));
    } catch (error) {
      console.error('Error extracting metadata:', error);
    } finally {
      setExtractingMetadata(false);
    }
  };

  const handleImageCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: undefined }));
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.url || !formData.title || !formData.category || !formData.platform) {
        throw new Error('Please fill in all required fields');
      }

      if (!isValidUrl(formData.url)) {
        throw new Error('Please enter a valid social media URL');
      }

      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit trend');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === formData.category);
  const selectedPlatform = platforms.find(p => p.id === formData.platform);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 z-50 overflow-hidden">
      {/* Fixed Close Button for Mobile */}
      <button
        onClick={onClose}
        className="fixed top-4 left-4 z-50 p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600 shadow-lg safe-area-top"
        aria-label="Close"
      >
        <XIcon className="w-6 h-6 text-white" />
      </button>
      
      {/* Mobile Header */}
      <div className="safe-area-top bg-wave-900/90 backdrop-blur-lg border-b border-wave-700/30">
        <div className="flex items-center justify-between p-4">
          <div className="w-12">{/* Spacer for close button */}</div>
          <h1 className="text-lg font-semibold text-white">Submit Trend</h1>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.url || !formData.title || !formData.category || !formData.platform}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all
              ${loading || !formData.url || !formData.title || !formData.category || !formData.platform
                ? 'bg-wave-800/30 text-wave-600 cursor-not-allowed'
                : 'bg-wave-600 text-white hover:bg-wave-500'
              }
            `}
          >
            {loading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : 'Submit'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 pb-24 space-y-6">
          {/* URL Input with Clipboard */}
          <div>
            <label className="block text-wave-200 mb-3 font-medium text-lg">
              <LinkIcon className="w-5 h-5 inline mr-2" />
              Content Link
            </label>
            <div className="relative">
              <input
                type="url"
                value={formData.url}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, url: e.target.value }));
                  if (isValidUrl(e.target.value)) {
                    extractMetadataFromUrl(e.target.value);
                  }
                }}
                className="w-full px-4 py-4 pr-12 text-lg rounded-2xl bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none"
                placeholder="Paste TikTok, Instagram, etc. link"
                required
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const clipboardText = await navigator.clipboard.readText();
                    if (isValidUrl(clipboardText)) {
                      setFormData(prev => ({ ...prev, url: clipboardText }));
                      extractMetadataFromUrl(clipboardText);
                    }
                  } catch (error) {
                    console.log('Clipboard access denied');
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-wave-700/50 transition-all"
              >
                <ClipboardIcon className="w-5 h-5 text-wave-400" />
              </button>
            </div>
          </div>

          {/* Platform Selection */}
          {formData.platform && (
            <div>
              <label className="block text-wave-200 mb-3 font-medium text-lg">Platform</label>
              <button
                type="button"
                onClick={() => setShowPlatformPicker(true)}
                className="w-full px-4 py-4 rounded-2xl bg-wave-800/50 border border-wave-700/30 text-white flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{selectedPlatform?.emoji}</span>
                  <span className="text-lg">{selectedPlatform?.label}</span>
                </div>
                <ChevronDownIcon className="w-5 h-5 text-wave-400" />
              </button>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-wave-200 mb-3 font-medium text-lg">
              Trend Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-4 text-lg rounded-2xl bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none"
              placeholder="Give this trend a catchy name..."
              required
            />
          </div>


          {/* Category Selection */}
          <div>
            <label className="block text-wave-200 mb-3 font-medium text-lg">
              <HashIcon className="w-5 h-5 inline mr-2" />
              Category
            </label>
            <button
              type="button"
              onClick={() => setShowCategoryPicker(true)}
              className={`
                w-full px-4 py-4 rounded-2xl border transition-all text-left
                ${formData.category 
                  ? 'bg-wave-600/20 border-wave-500 text-white' 
                  : 'bg-wave-800/50 border-wave-700/30 text-wave-400'
                }
              `}
            >
              {selectedCategory ? (
                <div className="flex items-center gap-3">
                  <span className="text-xl">{selectedCategory.emoji}</span>
                  <span className="text-lg">{selectedCategory.label}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-lg">Select category...</span>
                  <ChevronDownIcon className="w-5 h-5" />
                </div>
              )}
            </button>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-wave-200 mb-3 font-medium text-lg">
              <CameraIcon className="w-5 h-5 inline mr-2" />
              Add Image (Optional)
            </label>
            
            {!imagePreview ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Camera Capture */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="border-2 border-dashed border-wave-600/50 rounded-2xl p-6 text-center hover:border-wave-500/70 transition-all"
                >
                  <CameraIcon className="w-8 h-8 text-wave-400 mx-auto mb-2" />
                  <p className="text-wave-300 text-sm font-medium">Take Photo</p>
                </button>

                {/* Gallery Upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-wave-600/50 rounded-2xl p-6 text-center hover:border-wave-500/70 transition-all"
                >
                  <div className="w-8 h-8 bg-wave-400 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-white text-xs">📷</span>
                  </div>
                  <p className="text-wave-300 text-sm font-medium">From Gallery</p>
                </button>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-2xl"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 p-2 bg-red-500 rounded-full hover:bg-red-600 transition-all"
                >
                  <XIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
            
            {/* Hidden inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageCapture}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center">
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Category Picker Modal */}
      <AnimatePresence>
        {showCategoryPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-end z-60"
            onClick={() => setShowCategoryPicker(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full bg-wave-900 rounded-t-3xl p-6 safe-area-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-12 h-1 bg-wave-600 rounded-full mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-white">Select Category</h3>
              </div>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, category: category.id }));
                      setShowCategoryPicker(false);
                    }}
                    className={`
                      w-full px-4 py-4 rounded-2xl text-left transition-all flex items-center gap-3
                      ${formData.category === category.id
                        ? 'bg-wave-600 text-white'
                        : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                      }
                    `}
                  >
                    <span className="text-2xl">{category.emoji}</span>
                    <span className="text-lg font-medium">{category.label}</span>
                    {formData.category === category.id && (
                      <CheckIcon className="w-5 h-5 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Platform Picker Modal */}
      <AnimatePresence>
        {showPlatformPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-end z-60"
            onClick={() => setShowPlatformPicker(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full bg-wave-900 rounded-t-3xl p-6 safe-area-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-12 h-1 bg-wave-600 rounded-full mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-white">Select Platform</h3>
              </div>
              
              <div className="space-y-3">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, platform: platform.id }));
                      setShowPlatformPicker(false);
                    }}
                    className={`
                      w-full px-4 py-4 rounded-2xl text-left transition-all flex items-center gap-3
                      ${formData.platform === platform.id
                        ? 'bg-wave-600 text-white'
                        : 'bg-wave-800/50 text-wave-300 hover:bg-wave-700/50'
                      }
                    `}
                  >
                    <span className="text-2xl">{platform.emoji}</span>
                    <span className="text-lg font-medium">{platform.label}</span>
                    {formData.platform === platform.id && (
                      <CheckIcon className="w-5 h-5 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}