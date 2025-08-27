'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { MetadataExtractor } from '@/lib/metadataExtractorSafe';
import { TrendDuplicateChecker } from '@/lib/trendDuplicateChecker';
import { useToast } from '@/contexts/ToastContext';
import { TrendIntelligenceService } from '@/services/TrendIntelligenceService';
import { 
  TrendIntelligenceData,
  CATEGORIES,
  PLATFORMS,
  CATEGORY_QUESTIONS,
  UNIVERSAL_INTELLIGENCE,
  DEMOGRAPHICS,
  SUBCULTURES
} from '@/lib/trendIntelligenceConfig';
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
  TrendingUp as TrendingUpIcon,
  Brain as BrainIcon,
  Users as UsersIcon,
  Target as TargetIcon,
  MessageSquare as MessageSquareIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  Info as InfoIcon,
  Sparkles as SparklesIcon
} from 'lucide-react';

// Using TrendIntelligenceData type from config
// We use Partial since not all fields are required initially
type TrendData = Partial<TrendIntelligenceData> & {
  image?: File | string;
};

// Categories and platforms are now imported from trendIntelligenceConfig

interface TrendSubmissionFormProps {
  onClose: () => void;
  onSubmit?: (data: Partial<TrendIntelligenceData>) => Promise<void>;
  initialUrl?: string;
}

export default function TrendSubmissionForm({ onClose, onSubmit: customSubmit, initialUrl = '' }: TrendSubmissionFormProps) {
  const { user } = useAuth();
  const { showError, showWarning, showSuccess } = useToast();
  const DRAFT_KEY = 'wavesight_trend_draft';
  
  // Load draft from localStorage
  const loadDraft = (): TrendData => {
    if (typeof window !== 'undefined') {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          return JSON.parse(draft);
        } catch (e) {
          showWarning('Could not load saved draft', 'Starting with a fresh form');
        }
      }
    }
    return {
      url: initialUrl,
      title: '',
      category: undefined as any,  // Will be set when user selects
      platform: undefined as any,  // Will be set when user selects
      creatorHandle: '',
      creatorName: '',
      postCaption: '',
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      viewsCount: 0,
      hashtags: [],
      thumbnailUrl: '',
      postedAt: '',
      waveScore: 50
    };
  };
  
  const [formData, setFormData] = useState<TrendData>(loadDraft());
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1);
  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Save draft to localStorage when form data changes
  useEffect(() => {
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }
    
    draftSaveTimeoutRef.current = setTimeout(() => {
      if (formData.url || formData.title) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      }
    }, 1000); // Debounce for 1 second
    
    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [formData]);
  
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

  // Auto-extract metadata if initialUrl is provided
  useEffect(() => {
    if (initialUrl && isValidUrl(initialUrl) && !formData.title) {
      extractMetadataFromUrl(initialUrl);
    }
  }, [initialUrl]);

  // Auto-detect platform from URL and set it immediately
  const detectAndSetPlatform = (url: string) => {
    if (url.includes('tiktok.com')) {
      setFormData(prev => ({ ...prev, platform: 'tiktok' }));
    } else if (url.includes('instagram.com')) {
      setFormData(prev => ({ ...prev, platform: 'instagram' }));
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      setFormData(prev => ({ ...prev, platform: 'youtube' }));
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      setFormData(prev => ({ ...prev, platform: 'twitter' }));
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
        platform: platform as any,
        title: prev.title || '', // Keep title empty for manual input
        creatorHandle: extractedData.creator_handle || prev.creatorHandle || '',
        // For TikTok, use handle as creator name if no name is provided
        creatorName: extractedData.creator_name || 
                     (platform === 'tiktok' && extractedData.creator_handle ? 
                      extractedData.creator_handle : prev.creatorName || ''),
        postCaption: extractedData.post_caption || prev.postCaption || '',
        likesCount: extractedData.likes_count || prev.likesCount || 0,
        commentsCount: extractedData.comments_count || prev.commentsCount || 0,
        sharesCount: extractedData.shares_count || prev.sharesCount || 0,
        viewsCount: extractedData.views_count || prev.viewsCount || 0,
        hashtags: extractedData.hashtags || prev.hashtags || [],
        thumbnailUrl: extractedData.thumbnail_url || prev.thumbnailUrl,
        postedAt: extractedData.posted_at || prev.postedAt || ''
      }));
    } catch (error) {
      showError('Failed to extract metadata', 'Please fill in the details manually');
    } finally {
      setExtractingMetadata(false);
    }
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

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.url) {
      errors.url = 'URL is required';
    } else if (!isValidUrl(formData.url)) {
      errors.url = 'Please enter a valid social media URL';
    }
    
    if (!formData.title || formData.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }
    
    if (!formData.category) {
      errors.category = 'Please select a category';
    }
    
    if (!formData.platform) {
      errors.platform = 'Please select a platform';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      setError('Please fix the errors below');
      return;
    }
    
    setLoading(true);
    console.log('Submitting form data:', formData);

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Submission timeout - please try again')), 30000)
      );
      
      const result = await Promise.race([
        customSubmit ? customSubmit(formData) : Promise.resolve(),
        timeoutPromise
      ]);
      
      console.log('Submit result:', result);
      
      setSuccess('Trend submitted successfully!');
      
      // Clear the draft on successful submission
      localStorage.removeItem(DRAFT_KEY);
      
      // Show success for a moment before closing
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      showError('Failed to submit trend', err.message || 'Please try again later');
      setError(err.message || 'Failed to submit trend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setError('');
    
    if (step === 1) {
      const errors: {[key: string]: string} = {};
      
      if (!formData.url) {
        errors.url = 'URL is required';
      } else if (!isValidUrl(formData.url)) {
        errors.url = 'Please enter a valid social media URL';
      }
      
      if (!formData.title || formData.title.trim().length < 3) {
        errors.title = 'Title must be at least 3 characters';
      }
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setError('Please fix the errors before continuing');
        return;
      }
    }
    
    if (step === 2) {
      const errors: {[key: string]: string} = {};
      
      if (!formData.platform) {
        errors.platform = 'Please select a platform';
      }
      
      if (!formData.category) {
        errors.category = 'Please select a category';
      }
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setError('Please complete all required fields');
        return;
      }
    }
    
    setValidationErrors({});
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };
  
  const clearDraft = () => {
    const confirmed = confirm('Are you sure you want to clear all form data?');
    if (confirmed) {
      // Clear form data
      setFormData({
        url: '',
        title: '',
        category: undefined as any,
        platform: undefined as any,
        creatorHandle: '',
        creatorName: '',
        postCaption: '',
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        hashtags: [],
        thumbnailUrl: '',
        postedAt: '',
        waveScore: 50
      });
      
      // Clear other states
      setImagePreview(null);
      setError('');
      setSuccess('');
      setValidationErrors({});
      setDuplicateWarning('');
      setStep(1);
      
      // Clear localStorage
      localStorage.removeItem(DRAFT_KEY);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
          <div className="flex items-center gap-2">
            {(formData.url || formData.title) && (
              <>
                <span className="text-xs text-wave-500">Draft saved</span>
                <button
                  onClick={clearDraft}
                  className="p-2 rounded-lg hover:bg-red-500/20 transition-all group"
                  title="Clear draft"
                >
                  <TrashIcon className="w-4 h-4 text-wave-400 group-hover:text-red-400" />
                </button>
              </>
            )}
            <button
              onClick={() => {
                if (formData.url || formData.title) {
                  if (confirm('Are you sure? Your draft will be saved.')) {
                    onClose();
                  }
                } else {
                  onClose();
                }
              }}
              className="p-2 rounded-lg hover:bg-wave-800/50 transition-all"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
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
                    onChange={async (e) => {
                      const newUrl = e.target.value;
                      setFormData(prev => ({ ...prev, url: newUrl }));
                      setDuplicateWarning('');
                      
                      if (isValidUrl(newUrl)) {
                        // Immediately detect and set platform
                        detectAndSetPlatform(newUrl);
                        
                        // Check for duplicates
                        const duplicateCheck = await TrendDuplicateChecker.checkDuplicateUrl(newUrl, user?.id);
                        if (duplicateCheck.isDuplicate) {
                          setDuplicateWarning(duplicateCheck.message || 'This trend has already been submitted');
                        }
                        
                        // Extract metadata
                        extractMetadataFromUrl(newUrl);
                      }
                    }}
                    className={`w-full px-4 py-3 rounded-xl bg-wave-800/50 border text-white placeholder-wave-500 focus:outline-none focus:ring-2 ${
                      validationErrors.url 
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-wave-700/30 focus:border-wave-500 focus:ring-wave-500/20'
                    }`}
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
                          setDuplicateWarning('');
                          
                          // Check for duplicates
                          const duplicateCheck = await TrendDuplicateChecker.checkDuplicateUrl(clipboardText, user?.id);
                          if (duplicateCheck.isDuplicate) {
                            setDuplicateWarning(duplicateCheck.message || 'This trend has already been submitted');
                          }
                          
                          extractMetadataFromUrl(clipboardText);
                        } else if (clipboardText) {
                          setError('Invalid URL. Please paste a link from TikTok, Instagram, YouTube, or Twitter/X');
                          setTimeout(() => setError(''), 3000);
                        }
                      } catch (error) {
                        console.log('Clipboard access denied');
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-wave-700/50 transition-all"
                    disabled={extractingMetadata}
                  >
                    {extractingMetadata ? (
                      <LoaderIcon className="w-4 h-4 text-wave-400 animate-spin" />
                    ) : (
                      <ClipboardIcon className="w-4 h-4 text-wave-400" />
                    )}
                  </button>
                </div>
                {validationErrors.url ? (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.url}</p>
                ) : (
                  <p className="text-xs text-wave-500 mt-1">
                    Paste a link from TikTok, Instagram, YouTube, or Twitter/X
                  </p>
                )}
                {extractingMetadata && (
                  <p className="text-xs text-wave-400 mt-1 animate-pulse">
                    Extracting post metadata...
                  </p>
                )}
                {duplicateWarning && (
                  <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-xs text-yellow-400 flex items-start gap-1">
                      <AlertCircleIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {duplicateWarning}
                    </p>
                  </div>
                )}
                
                {/* Platform indicator when URL is entered */}
                {formData.platform && formData.url && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-wave-700/30 border border-wave-600/40 rounded-full"
                  >
                    <div className={`w-3 h-3 rounded-full ${
                      PLATFORMS.find(p => p.id === formData.platform)?.color || 'bg-gray-600'
                    }`} />
                    <span className="text-xs text-wave-300 font-medium">
                      {PLATFORMS.find(p => p.id === formData.platform)?.label || 'Platform'} detected
                    </span>
                  </motion.div>
                )}
                
                {/* Show extracted metadata immediately */}
                {(formData.creatorHandle || formData.postCaption || formData.postedAt || formData.thumbnailUrl) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 bg-wave-600/20 border border-wave-600/40 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      {/* Show thumbnail if available */}
                      {formData.thumbnailUrl && (
                        <div className="flex-shrink-0">
                          <img 
                            src={formData.thumbnailUrl} 
                            alt="Trend thumbnail" 
                            className="w-20 h-20 object-cover rounded-lg border border-wave-600/40"
                            onError={(e) => {
                              // Hide image if it fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="flex items-start gap-2 flex-1">
                        <CheckIcon className="w-4 h-4 text-wave-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-wave-300 font-medium">Metadata captured successfully!</p>
                          {formData.creatorHandle && (
                            <p className="text-xs text-wave-400">
                              Creator: <span className="text-wave-200">{formData.creatorHandle}</span>
                              {formData.creatorName && formData.creatorName !== formData.creatorHandle && 
                                <span className="text-wave-300"> ({formData.creatorName})</span>
                              }
                            </p>
                          )}
                          {formData.postCaption && (
                            <p className="text-xs text-wave-400">
                              Caption: <span className="text-wave-200 line-clamp-2">{formData.postCaption}</span>
                            </p>
                          )}
                          {formData.hashtags && formData.hashtags.length > 0 && (
                            <p className="text-xs text-wave-400">
                              Hashtags: <span className="text-wave-300">{formData.hashtags.slice(0, 5).map(tag => `#${tag}`).join(' ')}</span>
                              {formData.hashtags.length > 5 && <span className="text-wave-500"> +{formData.hashtags.length - 5} more</span>}
                            </p>
                          )}
                          {formData.postedAt && (
                            <p className="text-xs text-wave-400">
                              Posted: <span className="text-wave-300">{new Date(formData.postedAt).toLocaleDateString()}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Trend Umbrella Title */}
              <div>
                <label className="block text-wave-200 mb-2 font-medium">
                  Trend Umbrella Name *
                  <span className="text-sm text-wave-400 font-normal ml-2">
                    (Name the overall trend, not this specific video)
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl bg-wave-800/50 border text-white placeholder-wave-500 focus:outline-none focus:ring-2 ${
                    validationErrors.title 
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-wave-700/30 focus:border-wave-500 focus:ring-wave-500/20'
                  }`}
                  placeholder="e.g. 'Winter Arc Challenge', 'Man in Finance', 'Brat Summer'..."
                  required
                />
                {validationErrors.title ? (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.title}</p>
                ) : (
                  <p className="text-xs text-wave-400 mt-2">
                    Videos with similar themes will be grouped under this trend umbrella
                  </p>
                )}
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
                  Platform * {validationErrors.platform && <span className="text-red-400 text-sm font-normal">({validationErrors.platform})</span>}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, platform: platform.id as TrendIntelligenceData['platform'] }))}
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
                  Category * {validationErrors.category && <span className="text-red-400 text-sm font-normal">({validationErrors.category})</span>}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: category.id as TrendIntelligenceData['category'] }))}
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

              {/* Wave Score Slider */}
              <div>
                <label className="block text-wave-200 mb-3 font-medium">
                  🌊 Wave Score - How cool is this trend?
                </label>
                <div className="bg-wave-800/30 rounded-xl p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-wave-300 text-sm mb-1">Rate the coolness factor</p>
                      <p className="text-wave-500 text-xs">0 = Not cool at all | 100 = Extremely cool</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold bg-gradient-to-r from-wave-400 to-wave-600 bg-clip-text text-transparent">
                        {formData.waveScore || 50}
                      </div>
                      <p className="text-wave-400 text-xs">Wave Score</p>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.waveScore || 50}
                      onChange={(e) => setFormData(prev => ({ ...prev, waveScore: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-wave-700/50 rounded-lg appearance-none cursor-pointer slider-thumb"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #8b5cf6 ${formData.waveScore || 50}%, #374151 ${formData.waveScore || 50}%, #374151 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-wave-500 mt-2">
                      <span>0</span>
                      <span>25</span>
                      <span>50</span>
                      <span>75</span>
                      <span>100</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-xs">
                    <span className="text-wave-600">🥱 Meh</span>
                    <span className="text-wave-500">😐 OK</span>
                    <span className="text-wave-400">👍 Cool</span>
                    <span className="text-wave-300">🔥 Fire</span>
                    <span className="text-wave-200">🌊 Wave!</span>
                  </div>
                </div>
              </div>

              {/* Social Media Metadata */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-wave-200 font-medium">Post Details</h3>
                  {(formData.creatorHandle || formData.postCaption) && (
                    <span className="text-xs bg-wave-600/30 text-wave-300 px-2 py-1 rounded-full">
                      Auto-filled from URL
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-wave-300 text-sm mb-1">
                      Creator Handle
                      {formData.creatorHandle && (
                        <CheckIcon className="w-3 h-3 inline ml-1 text-wave-400" />
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.creatorHandle}
                      onChange={(e) => setFormData(prev => ({ ...prev, creatorHandle: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg bg-wave-800/50 border text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none text-sm ${
                        formData.creatorHandle ? 'border-wave-600/50' : 'border-wave-700/30'
                      }`}
                      placeholder="@username"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-wave-300 text-sm mb-1">Creator Name</label>
                    <input
                      type="text"
                      value={formData.creatorName}
                      onChange={(e) => setFormData(prev => ({ ...prev, creatorName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none text-sm"
                      placeholder="Display name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-wave-300 text-sm mb-1">
                    Post Caption
                    {formData.postCaption && (
                      <CheckIcon className="w-3 h-3 inline ml-1 text-wave-400" />
                    )}
                  </label>
                  <textarea
                    value={formData.postCaption}
                    onChange={(e) => setFormData(prev => ({ ...prev, postCaption: e.target.value }))}
                    rows={2}
                    className={`w-full px-3 py-2 rounded-lg bg-wave-800/50 border text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none text-sm ${
                      formData.postCaption ? 'border-wave-600/50' : 'border-wave-700/30'
                    }`}
                    placeholder="Original post caption..."
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-wave-300 text-sm mb-1">Likes</label>
                    <input
                      type="number"
                      value={formData.likesCount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, likesCount: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-600 focus:border-wave-500 focus:outline-none text-sm"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-wave-300 text-sm mb-1">Comments</label>
                    <input
                      type="number"
                      value={formData.commentsCount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, commentsCount: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-600 focus:border-wave-500 focus:outline-none text-sm"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-wave-300 text-sm mb-1">Shares</label>
                    <input
                      type="number"
                      value={formData.sharesCount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, sharesCount: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-600 focus:border-wave-500 focus:outline-none text-sm"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-wave-300 text-sm mb-1">Views</label>
                    <input
                      type="number"
                      value={formData.viewsCount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, viewsCount: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-600 focus:border-wave-500 focus:outline-none text-sm"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-wave-300 text-sm mb-1">Hashtags (comma separated)</label>
                  <input
                    type="text"
                    value={formData.hashtags?.join(', ')}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      hashtags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
                    }))}
                    className="w-full px-3 py-2 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none text-sm"
                    placeholder="#trending, #viral, #fyp"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-wave-200 mb-3 font-medium">
                  <ImageIcon className="w-4 h-4 inline mr-2" />
                  Add Image (Optional)
                </label>
                
                {/* Show auto-captured thumbnail if available */}
                {formData.thumbnailUrl && !imagePreview && (
                  <div className="mb-4 p-3 bg-wave-700/20 border border-wave-600/40 rounded-xl">
                    <div className="flex items-start gap-3">
                      <img 
                        src={formData.thumbnailUrl} 
                        alt="Auto-captured thumbnail" 
                        className="w-24 h-24 object-cover rounded-lg border border-wave-600/40"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm text-wave-200 font-medium mb-1">Auto-captured thumbnail</p>
                        <p className="text-xs text-wave-400">This thumbnail was automatically extracted from the trend URL.</p>
                        <p className="text-xs text-wave-500 mt-2">You can upload a different image below if you prefer.</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {!imagePreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-wave-600/50 rounded-xl p-6 text-center cursor-pointer hover:border-wave-500/70 transition-all"
                  >
                    <UploadIcon className="w-8 h-8 text-wave-400 mx-auto mb-2" />
                    <p className="text-wave-300 mb-1">
                      {formData.thumbnailUrl ? 'Upload a different image' : 'Click to upload image'}
                    </p>
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
                  
                  <div className="flex gap-4">
                    <div>
                      <span className="text-wave-400 text-sm">Platform:</span>
                      <p className="text-wave-200 capitalize">{formData.platform}</p>
                    </div>
                    <div>
                      <span className="text-wave-400 text-sm">Category:</span>
                      <p className="text-wave-200">
                        {CATEGORIES.find(c => c.id === formData.category)?.label}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-wave-400 text-sm">Wave Score:</span>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 bg-wave-700/30 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-wave-500 to-wave-600 transition-all"
                          style={{ width: `${formData.waveScore || 50}%` }}
                        />
                      </div>
                      <span className="text-xl font-bold bg-gradient-to-r from-wave-400 to-wave-600 bg-clip-text text-transparent">
                        {formData.waveScore || 50}
                      </span>
                    </div>
                  </div>

                  {(imagePreview || formData.thumbnailUrl) && (
                    <div>
                      <span className="text-wave-400 text-sm">Image:</span>
                      <div className="flex gap-3 mt-2">
                        {formData.thumbnailUrl && (
                          <div>
                            <p className="text-xs text-wave-500 mb-1">Auto-captured thumbnail:</p>
                            <img 
                              src={formData.thumbnailUrl} 
                              alt="Thumbnail" 
                              className="w-32 h-32 object-cover rounded-lg border border-wave-600/40"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        {imagePreview && (
                          <div>
                            <p className="text-xs text-wave-500 mb-1">Uploaded image:</p>
                            <img src={imagePreview} alt="Upload" className="w-32 h-32 object-cover rounded-lg border border-wave-600/40" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(formData.creatorHandle || formData.creatorName || formData.postCaption) && (
                    <div className="border-t border-wave-700/30 pt-4 mt-4">
                      <h4 className="text-wave-200 font-medium mb-2">Post Details</h4>
                      {formData.creatorHandle && (
                        <p className="text-wave-300 text-sm">Creator: {formData.creatorHandle} {formData.creatorName && `(${formData.creatorName})`}</p>
                      )}
                      {formData.postCaption && (
                        <p className="text-wave-300 text-sm mt-1">Caption: {formData.postCaption}</p>
                      )}
                      {((formData.likesCount || 0) > 0 || (formData.commentsCount || 0) > 0 || (formData.sharesCount || 0) > 0 || (formData.viewsCount || 0) > 0) && (
                        <div className="flex gap-4 mt-2 text-sm text-wave-400">
                          {(formData.likesCount || 0) > 0 && <span>❤️ {formData.likesCount?.toLocaleString()}</span>}
                          {(formData.commentsCount || 0) > 0 && <span>💬 {formData.commentsCount?.toLocaleString()}</span>}
                          {(formData.sharesCount || 0) > 0 && <span>🔄 {formData.sharesCount?.toLocaleString()}</span>}
                          {(formData.viewsCount || 0) > 0 && <span>👁️ {formData.viewsCount?.toLocaleString()}</span>}
                        </div>
                      )}
                      {formData.hashtags && formData.hashtags.length > 0 && (
                        <p className="text-wave-400 text-sm mt-2">
                          {formData.hashtags.map(tag => `#${tag}`).join(' ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Error/Success Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400"
              >
                <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}
            
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400"
              >
                <CheckIcon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

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