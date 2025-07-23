'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
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
  Loader as LoaderIcon
} from 'lucide-react';

interface TrendData {
  url: string;
  title: string;
  description: string;
  category: string;
  image?: File | string;
  platform: string;
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
  { id: 'tiktok', label: 'TikTok', color: 'bg-black' },
  { id: 'instagram', label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { id: 'youtube', label: 'YouTube', color: 'bg-red-600' },
  { id: 'twitter', label: 'Twitter/X', color: 'bg-black' },
  { id: 'other', label: 'Other', color: 'bg-gray-600' }
];

export default function TrendSubmissionForm({ onClose, onSubmit }: { 
  onClose: () => void; 
  onSubmit: (data: TrendData) => Promise<void>; 
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<TrendData>({
    url: '',
    title: '',
    description: '',
    category: '',
    platform: ''
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect clipboard content on mount
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText && isValidUrl(clipboardText)) {
            setFormData(prev => ({ ...prev, url: clipboardText }));
            // Auto-extract metadata from URL
            extractMetadataFromUrl(clipboardText);
          }
        }
      } catch (error) {
        // Clipboard access denied or not available
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
    // Auto-detect platform from URL
    let platform = '';
    if (url.includes('tiktok.com')) platform = 'tiktok';
    else if (url.includes('instagram.com')) platform = 'instagram';
    else if (url.includes('youtube.com')) platform = 'youtube';
    else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';
    else platform = 'other';

    setFormData(prev => ({ ...prev, platform }));

    // In a real app, you'd call an API to extract metadata
    // For now, we'll just set the platform
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: undefined }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
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

  const nextStep = () => {
    if (step === 1 && (!formData.url || !formData.title)) {
      setError('Please enter both URL and title to continue');
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="wave-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Submit New Trend</h2>
            <p className="text-wave-400 text-sm">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-wave-800/50 transition-all"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-wave-400 mb-2">
            <span>Basic Info</span>
            <span>Category & Platform</span>
            <span>Review & Submit</span>
          </div>
          <div className="h-2 bg-wave-800/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-wave-500 to-wave-600"
              initial={{ width: '33%' }}
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* URL Input with Clipboard Detection */}
              <div>
                <label className="block text-wave-200 mb-2 font-medium">
                  <LinkIcon className="w-4 h-4 inline mr-2" />
                  Content URL *
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
                    className="w-full px-4 py-3 rounded-xl bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/20"
                    placeholder="https://tiktok.com/@user/video/123..."
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-wave-700/50 transition-all"
                  >
                    <ClipboardIcon className="w-4 h-4 text-wave-400" />
                  </button>
                </div>
                <p className="text-xs text-wave-500 mt-1">
                  Paste a link from TikTok, Instagram, YouTube, or Twitter/X
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-wave-200 mb-2 font-medium">
                  Trend Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/20"
                  placeholder="Give this trend a catchy name..."
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-wave-200 mb-2 font-medium">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/20"
                  placeholder="What makes this trend special? Describe the key elements..."
                />
              </div>
            </motion.div>
          )}

          {/* Step 2: Category & Platform */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Platform Selection */}
              <div>
                <label className="block text-wave-200 mb-3 font-medium">
                  Platform *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, platform: platform.id }))}
                      className={`
                        p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2
                        ${formData.platform === platform.id
                          ? 'border-wave-500 bg-wave-600/20'
                          : 'border-wave-700/30 hover:border-wave-600/50'
                        }
                      `}
                    >
                      <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                      <span className="text-sm font-medium">{platform.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-wave-200 mb-3 font-medium">
                  <TagIcon className="w-4 h-4 inline mr-2" />
                  Category *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: category.id }))}
                      className={`
                        p-4 rounded-xl border-2 transition-all text-left
                        ${formData.category === category.id
                          ? 'border-wave-500 bg-wave-600/20'
                          : 'border-wave-700/30 hover:border-wave-600/50'
                        }
                      `}
                    >
                      <div className="font-medium text-wave-200 mb-1">{category.label}</div>
                      <div className="text-xs text-wave-400">{category.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-wave-200 mb-3 font-medium">
                  <ImageIcon className="w-4 h-4 inline mr-2" />
                  Add Image (Optional)
                </label>
                
                {!imagePreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-wave-600/50 rounded-xl p-6 text-center cursor-pointer hover:border-wave-500/70 transition-all"
                  >
                    <UploadIcon className="w-8 h-8 text-wave-400 mx-auto mb-2" />
                    <p className="text-wave-300 mb-1">Click to upload image</p>
                    <p className="text-xs text-wave-500">PNG, JPG up to 10MB</p>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-all"
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
            </motion.div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-wave-800/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Review Your Submission</h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-wave-400 text-sm">URL:</span>
                    <p className="text-wave-200 break-all">{formData.url}</p>
                  </div>
                  
                  <div>
                    <span className="text-wave-400 text-sm">Title:</span>
                    <p className="text-wave-200">{formData.title}</p>
                  </div>
                  
                  {formData.description && (
                    <div>
                      <span className="text-wave-400 text-sm">Description:</span>
                      <p className="text-wave-200">{formData.description}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    <div>
                      <span className="text-wave-400 text-sm">Platform:</span>
                      <p className="text-wave-200 capitalize">{formData.platform}</p>
                    </div>
                    <div>
                      <span className="text-wave-400 text-sm">Category:</span>
                      <p className="text-wave-200">
                        {categories.find(c => c.id === formData.category)?.label}
                      </p>
                    </div>
                  </div>

                  {imagePreview && (
                    <div>
                      <span className="text-wave-400 text-sm">Image:</span>
                      <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg mt-2" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              <AlertCircleIcon className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={step === 1 ? onClose : prevStep}
              className="px-6 py-2 rounded-xl bg-wave-800/50 hover:bg-wave-700/50 transition-all"
            >
              {step === 1 ? 'Cancel' : 'Previous'}
            </button>
            
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-wave-500 to-wave-600 hover:from-wave-400 hover:to-wave-500 transition-all"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
                {loading ? 'Submitting...' : 'Submit Trend'}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}