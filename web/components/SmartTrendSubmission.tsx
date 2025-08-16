'use client';

import { useState, useEffect, useRef } from 'react';
import SentimentSlider from './SentimentSlider';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { MetadataExtractor } from '@/lib/metadataExtractorSafe';
import { getUltraSimpleThumbnail } from '@/lib/ultraSimpleThumbnail';
import { calculateWaveScore } from '@/lib/calculateWaveScore';
import TrendWritingHelper from './TrendWritingHelper';
import { 
  Link as LinkIcon,
  Send as SendIcon,
  X as XIcon,
  Loader as LoaderIcon,
  ChevronRight as ChevronRightIcon,
  TrendingUp as TrendingUpIcon,
  Sparkles as SparklesIcon,
  Check as CheckIcon,
  AlertCircle as AlertCircleIcon,
  User as UserIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  MessageCircle as CommentIcon,
  Zap as ZapIcon,
  Hash as HashIcon,
  Clock as ClockIcon,
  Users as UsersIcon,
  Globe as GlobeIcon,
  Camera as CameraIcon,
  Music as MusicIcon,
  DollarSign as DollarSignIcon,
  Shirt as ShirtIcon,
  Utensils as UtensilsIcon,
  Gamepad2 as GamepadIcon,
  Palette as PaletteIcon,
  Scale as ScaleIcon,
  Trophy as TrophyIcon,
  Briefcase as BriefcaseIcon,
  Heart as HealthIcon
} from 'lucide-react';

interface SmartTrendSubmissionProps {
  onClose: () => void;
  onSubmit?: (data: any) => Promise<void>;
  initialUrl?: string;
}

// Category configuration with icons and specific questions
const CATEGORIES = [
  { 
    id: 'meme', 
    label: 'Meme/Humor', 
    icon: '😂',
    color: 'from-yellow-500 to-orange-500',
    questions: {
      format: {
        label: 'What type of meme is this?',
        options: ['Image meme', 'Video meme', 'Text joke', 'Sound/Audio', 'Challenge']
      },
      remixability: {
        label: 'How remixable is it?',
        options: ['Everyone\'s doing their version', 'Some variations', 'One-off joke']
      }
    }
  },
  { 
    id: 'fashion', 
    label: 'Fashion/Beauty', 
    icon: '👗',
    color: 'from-pink-500 to-purple-500',
    questions: {
      style: {
        label: 'What aesthetic is this?',
        options: ['Y2K', 'Clean girl', 'Mob wife', 'Coquette', 'Dark academia', 'Streetwear', 'Other']
      },
      pricePoint: {
        label: 'What\'s the price vibe?',
        options: ['Thrifted/DIY', 'Fast fashion', 'Mid-range', 'Luxury', 'Mix high-low']
      },
      longevity: {
        label: 'How long will this last?',
        options: ['Few weeks', 'This season', '6 months', 'Year+', 'Could be timeless']
      }
    }
  },
  { 
    id: 'food', 
    label: 'Food/Drink', 
    icon: '🍔',
    color: 'from-green-500 to-lime-500',
    questions: {
      type: {
        label: 'What kind of food trend?',
        options: ['Recipe hack', 'Restaurant trend', 'Cooking technique', 'Food challenge', 'Drink/cocktail']
      },
      difficulty: {
        label: 'How hard to make/get?',
        options: ['Super easy', 'Need some skills', 'Pretty complex', 'Restaurant only']
      },
      appeal: {
        label: 'Why are people into it?',
        options: ['Looks amazing', 'Tastes incredible', 'Health benefits', 'Just weird/fun', 'Nostalgic']
      }
    }
  },
  { 
    id: 'music', 
    label: 'Music/Dance', 
    icon: '🎵',
    color: 'from-purple-500 to-indigo-500',
    questions: {
      type: {
        label: 'What\'s trending?',
        options: ['Song/Sound', 'Dance move', 'Remix/Mashup', 'Artist', 'Music challenge']
      },
      usage: {
        label: 'How are people using it?',
        options: ['Background for videos', 'Dance videos', 'Lip sync', 'Emotional videos', 'Comedy']
      },
      origin: {
        label: 'Where\'d it come from?',
        options: ['New release', 'Old song revival', 'Remixed sound', 'Original creator', 'TV/Movie']
      }
    }
  },
  { 
    id: 'lifestyle', 
    label: 'Lifestyle', 
    icon: '🏡',
    color: 'from-blue-500 to-cyan-500',
    questions: {
      category: {
        label: 'What lifestyle area?',
        options: ['Morning routine', 'Productivity', 'Home decor', 'Wellness', 'Relationships', 'Money']
      },
      effort: {
        label: 'How much effort required?',
        options: ['Quick tip', 'Daily habit', 'Weekend project', 'Lifestyle change']
      },
      authenticity: {
        label: 'How real is this?',
        options: ['Actually helpful', 'Looks good on camera', 'Bit unrealistic', 'Total fantasy']
      }
    }
  },
  { 
    id: 'tech', 
    label: 'Tech/Gaming', 
    icon: '🎮',
    color: 'from-red-500 to-pink-500',
    questions: {
      type: {
        label: 'What kind of tech trend?',
        options: ['New app/tool', 'Gaming meta', 'Tech hack', 'AI thing', 'Gadget']
      },
      accessibility: {
        label: 'Who can do this?',
        options: ['Anyone', 'Need the app/game', 'Need expensive stuff', 'Tech savvy only']
      },
      staying: {
        label: 'Is this here to stay?',
        options: ['Quick fad', 'Few months', 'Changing how we do things', 'Revolutionary']
      }
    }
  },
  { 
    id: 'finance', 
    label: 'Finance/Crypto', 
    icon: '💰',
    color: 'from-green-500 to-emerald-500',
    questions: {
      type: {
        label: 'What finance trend?',
        options: ['Investment tip', 'Crypto/NFT', 'Side hustle', 'Money hack', 'Economic take']
      },
      risk: {
        label: 'Risk level?',
        options: ['Safe tip', 'Some risk', 'High risk', 'Probably a scam']
      },
      audience: {
        label: 'Who\'s jumping on this?',
        options: ['Everyone', 'Young investors', 'Crypto bros', 'Professionals', 'Influencers']
      }
    }
  },
  { 
    id: 'sports', 
    label: 'Sports/Fitness', 
    icon: '⚽',
    color: 'from-orange-500 to-red-500',
    questions: {
      type: {
        label: 'What kind of fitness trend?',
        options: ['Workout routine', 'Sports moment', 'Athlete trend', 'Fitness challenge', 'Health tip']
      },
      difficulty: {
        label: 'Fitness level needed?',
        options: ['Anyone can do it', 'Need some fitness', 'Pretty challenging', 'Athletes only']
      },
      science: {
        label: 'Is this legit?',
        options: ['Science-backed', 'Makes sense', 'Questionable', 'Definitely bro-science']
      }
    }
  },
  { 
    id: 'political', 
    label: 'Political/Social', 
    icon: '⚖️',
    color: 'from-gray-600 to-gray-800',
    questions: {
      type: {
        label: 'What kind of social trend?',
        options: ['Political movement', 'Social cause', 'Controversy', 'Awareness campaign', 'Protest']
      },
      reach: {
        label: 'How widespread?',
        options: ['Niche community', 'Growing awareness', 'Major discussion', 'Global movement']
      },
      impact: {
        label: 'Potential impact?',
        options: ['Raising awareness', 'Changing minds', 'Real policy change', 'Just noise']
      }
    }
  },
  { 
    id: 'cars', 
    label: 'Cars & Machines', 
    icon: '🚗',
    color: 'from-slate-600 to-zinc-700',
    questions: {
      type: {
        label: 'What kind of vehicle trend?',
        options: ['Car mod/custom', 'New vehicle', 'Driving technique', 'Car culture', 'Racing/performance']
      },
      accessibility: {
        label: 'How accessible is this?',
        options: ['Anyone with a car', 'Need specific vehicle', 'Expensive mods', 'Professional only']
      },
      appeal: {
        label: 'Why is it trending?',
        options: ['Looks amazing', 'Performance gains', 'Practical/useful', 'Just for fun', 'Status symbol']
      }
    }
  },
  { 
    id: 'animals', 
    label: 'Animals & Pets', 
    icon: '🐾',
    color: 'from-amber-500 to-orange-600',
    questions: {
      type: {
        label: 'What kind of animal trend?',
        options: ['Cute pet video', 'Training technique', 'Animal behavior', 'Pet care tip', 'Wildlife moment']
      },
      species: {
        label: 'What animal?',
        options: ['Dogs', 'Cats', 'Exotic pets', 'Farm animals', 'Wildlife']
      },
      virality: {
        label: 'Why is it viral?',
        options: ['Incredibly cute', 'Funny behavior', 'Unusual/rare', 'Heartwarming', 'Educational']
      }
    }
  },
  { 
    id: 'travel', 
    label: 'Travel & Places', 
    icon: '✈️',
    color: 'from-sky-500 to-blue-600',
    questions: {
      type: {
        label: 'What travel trend?',
        options: ['Hidden gem location', 'Travel hack', 'Tourist spot', 'Local culture', 'Adventure activity']
      },
      budget: {
        label: 'Cost level?',
        options: ['Budget friendly', 'Mid-range', 'Luxury', 'Free/cheap hack']
      },
      accessibility: {
        label: 'How easy to do?',
        options: ['Anyone can go', 'Need planning', 'Restricted access', 'Locals only']
      }
    }
  },
  { 
    id: 'education', 
    label: 'Education & Learning', 
    icon: '📚',
    color: 'from-indigo-500 to-purple-600',
    questions: {
      type: {
        label: 'What learning trend?',
        options: ['Study hack', 'Educational content', 'Language learning', 'Skill tutorial', 'Fun fact']
      },
      difficulty: {
        label: 'Learning curve?',
        options: ['Quick tip', 'Easy to learn', 'Takes practice', 'Expert level']
      },
      value: {
        label: 'How useful?',
        options: ['Life changing', 'Pretty helpful', 'Nice to know', 'Just interesting']
      }
    }
  },
  { 
    id: 'health', 
    label: 'Health & Wellness', 
    icon: '💊',
    color: 'from-teal-500 to-green-600',
    questions: {
      type: {
        label: 'What health trend?',
        options: ['Wellness routine', 'Medical info', 'Mental health', 'Diet trend', 'Exercise']
      },
      evidence: {
        label: 'How proven?',
        options: ['Doctor approved', 'Research backed', 'Anecdotal', 'Questionable']
      },
      commitment: {
        label: 'Effort needed?',
        options: ['One-time thing', 'Daily habit', 'Lifestyle change', 'Medical intervention']
      }
    }
  },
  { 
    id: 'product', 
    label: 'Product/Shopping', 
    icon: '🛍️',
    color: 'from-purple-500 to-pink-600',
    questions: {
      type: {
        label: 'What kind of product trend?',
        options: ['Must-have item', 'Shopping hack', 'Brand collab', 'Discount/deal', 'Unboxing/review']
      },
      priceRange: {
        label: 'Price point?',
        options: ['Under $20', '$20-50', '$50-100', '$100-500', 'Over $500']
      },
      availability: {
        label: 'How easy to get?',
        options: ['Widely available', 'Limited stock', 'Exclusive drop', 'Sold out everywhere', 'Pre-order only']
      }
    }
  }
];

export default function SmartTrendSubmission({ 
  onClose, 
  onSubmit: customSubmit, 
  initialUrl = ''
}: SmartTrendSubmissionProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);
  const extractionTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Form state
  const [currentStep, setCurrentStep] = useState<'url' | 'velocity' | 'category' | 'details' | 'review'>('url');
  const [formData, setFormData] = useState({
    // URL & Metadata
    url: initialUrl,
    platform: '',
    title: '',
    creator_handle: '',
    creator_name: '',
    post_caption: '',
    likes_count: 0,
    comments_count: 0,
    views_count: 0,
    hashtags: [] as string[],
    thumbnail_url: '',
    posted_at: '',
    
    // User inputs
    category: '',
    categoryAnswers: {} as Record<string, string>,
    whyTrending: '',
    audienceAge: [] as string[],
    predictedPeak: '',
    brandSafe: null as boolean | null,
    is_ai_generated: false,  // New field for AI-generated content
    
    // Velocity & Size (HIGH VALUE DATA)
    trendVelocity: '' as 'just_starting' | 'picking_up' | 'viral' | 'saturated' | 'declining' | '',
    sentiment: 50,
    trendSize: '' as 'micro' | 'niche' | 'viral' | 'mega' | 'global' | '',
    firstSeen: '' as 'today' | 'yesterday' | 'this_week' | 'last_week' | 'older' | '',
    
    // Calculated
    wave_score: 50
  });
  
  // Metadata display state
  const [metadata, setMetadata] = useState<any>(null);
  const [metadataError, setMetadataError] = useState('');

  // Auto-extract metadata when URL changes (with debounce)
  useEffect(() => {
    if (extractionTimeoutRef.current) {
      clearTimeout(extractionTimeoutRef.current);
    }

    if (formData.url && isValidUrl(formData.url)) {
      extractionTimeoutRef.current = setTimeout(() => {
        extractMetadata(formData.url);
      }, 500); // Wait 500ms after user stops typing
    }

    return () => {
      if (extractionTimeoutRef.current) {
        clearTimeout(extractionTimeoutRef.current);
      }
    };
  }, [formData.url]);

  const isValidUrl = (string: string): boolean => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const detectPlatform = (url: string): string => {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('reddit.com')) return 'reddit';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('threads.net')) return 'threads';
    return 'other';
  };

  const extractMetadata = async (url: string) => {
    setExtracting(true);
    setMetadataError('');
    
    try {
      const extractedData = await MetadataExtractor.extractFromUrl(url);
      const platform = detectPlatform(url);
      
      // Also try to get thumbnail via our API
      let thumbnailUrl = extractedData.thumbnail_url || '';
      if (!thumbnailUrl) {
        try {
          const response = await fetch('/api/extract-thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          
          if (response.ok) {
            const data = await response.json();
            thumbnailUrl = data.thumbnail_url || '';
          }
        } catch (err) {
          console.log('Could not fetch thumbnail during metadata extraction:', err);
        }
      }
      
      // Update form data with extracted metadata
      setFormData(prev => ({
        ...prev,
        platform,
        // Don't auto-fill title - let user provide their own
        title: prev.title,
        creator_handle: extractedData.creator_handle || '',
        creator_name: extractedData.creator_name || '',
        post_caption: extractedData.post_caption || '',
        likes_count: extractedData.likes_count || 0,
        comments_count: extractedData.comments_count || 0,
        views_count: extractedData.views_count || 0,
        hashtags: extractedData.hashtags || [],
        thumbnail_url: thumbnailUrl || extractedData.thumbnail_url || '',
        posted_at: extractedData.posted_at || new Date().toISOString()
      }));
      
      // Store metadata for display
      setMetadata(extractedData);
      
      // Calculate initial wave score
      const score = calculateWaveScore({
        trendName: extractedData.title || '',
        explanation: '',
        categories: [],
        views_count: extractedData.views_count || 0,
        likes_count: extractedData.likes_count || 0,
        comments_count: extractedData.comments_count || 0,
        thumbnail_url: extractedData.thumbnail_url || '',
        hashtags: extractedData.hashtags || [],
        creator_handle: extractedData.creator_handle || '',
        creator_name: extractedData.creator_name || ''
      });
      
      setFormData(prev => ({ ...prev, wave_score: score }));
      
    } catch (error) {
      console.error('Metadata extraction error:', error);
      setMetadataError('Could not extract metadata - continue anyway');
    } finally {
      setExtracting(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getSelectedCategory = () => {
    return CATEGORIES.find(c => c.id === formData.category);
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormData(prev => ({ ...prev, category: categoryId, categoryAnswers: {} }));
    setCurrentStep('details');
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 'url':
        if (!formData.url) {
          setError('Please paste a trend URL');
          return false;
        }
        if (!isValidUrl(formData.url)) {
          setError('Please enter a valid URL');
          return false;
        }
        if (!formData.title) {
          setError('Please add a title for this trend');
          return false;
        }
        break;
      case 'velocity':
        if (!formData.trendVelocity) {
          setError('Please select the trend velocity');
          return false;
        }
        if (!formData.trendSize) {
          setError('Please select the trend size');
          return false;
        }
        if (!formData.firstSeen) {
          setError('Please select when you first saw this');
          return false;
        }
        break;
      case 'category':
        if (!formData.category) {
          setError('Please select a category');
          return false;
        }
        break;
      case 'details':
        const category = getSelectedCategory();
        if (category) {
          const unanswered = Object.keys(category.questions).filter(
            key => !formData.categoryAnswers[key]
          );
          if (unanswered.length > 0) {
            setError('Please answer all category questions');
            return false;
          }
        }
        if (!formData.whyTrending || formData.whyTrending.length < 10) {
          setError('Please explain why this is trending (at least 10 characters)');
          return false;
        }
        if (formData.audienceAge.length === 0) {
          setError('Please select at least one age group');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    
    switch (currentStep) {
      case 'url':
        setCurrentStep('velocity');
        break;
      case 'velocity':
        setCurrentStep('category');
        break;
      case 'category':
        setCurrentStep('details');
        break;
      case 'details':
        setCurrentStep('review');
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'velocity':
        setCurrentStep('url');
        break;
      case 'category':
        setCurrentStep('velocity');
        break;
      case 'details':
        setCurrentStep('category');
        break;
      case 'review':
        setCurrentStep('details');
        break;
    }
    setError('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const category = getSelectedCategory();
      
      // Get thumbnail if not already captured
      let thumbnailUrl = formData.thumbnail_url;
      
      // Try to fetch thumbnail with timeout - don't block submission
      if (!thumbnailUrl && formData.url) {
        try {
          // Add timeout to prevent hanging
          const thumbnailPromise = fetch('/api/extract-thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: formData.url })
          });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Thumbnail fetch timeout')), 3000)
          );
          
          const response = await Promise.race([thumbnailPromise, timeoutPromise]) as Response;
          
          if (response && response.ok) {
            const data = await response.json();
            thumbnailUrl = data.thumbnail_url || '';
            console.log(`Thumbnail fetched for ${data.platform}:`, thumbnailUrl);
          }
        } catch (err) {
          console.log('Could not fetch thumbnail (will continue without):', err);
        }
      }
      
      // For other platforms, try simple extraction (but don't block)
      if (!thumbnailUrl && formData.url) {
        try {
          const thumbnailData = getUltraSimpleThumbnail(formData.url);
          thumbnailUrl = thumbnailData.thumbnail_url || '';
        } catch (err) {
          console.log('Could not get thumbnail (will continue without):', err);
        }
      }
      
      const submissionData = {
        ...formData,
        url: formData.url.trim(),
        screenshot_url: thumbnailUrl,
        thumbnail_url: thumbnailUrl,
        trendName: formData.title,
        explanation: formData.whyTrending,
        categories: [formData.category],
        ageRanges: formData.audienceAge,
        spreadSpeed: formData.trendVelocity || 'just_starting',
        categorySpecific: formData.categoryAnswers,
        brandAdoption: formData.brandSafe || false,
        motivation: `Category: ${category?.label}, ${Object.entries(formData.categoryAnswers).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
        firstSeen: formData.posted_at || new Date().toISOString(),
        moods: [],
        region: 'Global',
        audioOrCatchphrase: '',
        otherPlatforms: [],
        // HIGH VALUE INTELLIGENCE DATA
        trendVelocity: formData.trendVelocity,
        trendSize: formData.trendSize,
        firstSeenTiming: formData.firstSeen,
        velocityMetrics: {
          velocity: formData.trendVelocity,
          size: formData.trendSize,
          timing: formData.firstSeen,
          capturedAt: new Date().toISOString()
        },
        // Ensure wave_score is included
        wave_score: formData.sentiment || 50
      };

      if (customSubmit) {
        // Call the submit handler with timeout to prevent infinite hanging
        const submitPromise = customSubmit(submissionData);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Submission timed out. Please try again.')), 15000)
        );
        
        await Promise.race([submitPromise, timeoutPromise]);
      }

      // Success - close immediately
      setError('');
      setLoading(false);
      onClose();
    } catch (error: any) {
      console.error('Submission error:', error);
      const errorMsg = error.message || 'Failed to submit trend';
      
      // Check for specific error types
      if (errorMsg.includes('timeout')) {
        setError('Submission timed out. Please check your connection and try again.');
      } else if (errorMsg.includes('network')) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(errorMsg);
      }
      
      // Always set loading false on error
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-800 shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-5 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <TrendingUpIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Submit Trend</h2>
                <p className="text-xs text-gray-400">
                  {currentStep === 'url' && 'Add URL & Title'}
                  {currentStep === 'velocity' && 'Trend Velocity & Size'}
                  {currentStep === 'category' && 'Select Category'}
                  {currentStep === 'details' && `${getSelectedCategory()?.label} Details`}
                  {currentStep === 'review' && 'Review & Submit'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <XIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <AnimatePresence mode="wait">
            {/* Step 1: URL & Title */}
            {currentStep === 'url' && (
              <motion.div
                key="url"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Trend URL <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={urlInputRef}
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="Paste TikTok, Instagram, YouTube, X link..."
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none pr-10"
                      autoFocus
                    />
                    {extracting && (
                      <div className="absolute right-3 top-3.5">
                        <LoaderIcon className="w-5 h-5 text-blue-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  {metadataError && (
                    <p className="text-xs text-yellow-400 mt-1">{metadataError}</p>
                  )}
                </div>

                {/* Auto-extracted Metadata Display */}
                {metadata && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg p-4 border border-blue-800/30"
                  >
                    <div className="flex items-center gap-2 text-green-400 text-sm mb-3">
                      <CheckIcon className="w-4 h-4" />
                      <span className="font-medium">Metadata captured automatically</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Left side - stats */}
                      <div className="space-y-2">
                        {formData.creator_handle && (
                          <div className="flex items-center gap-2 text-sm">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-300">{formData.creator_handle.startsWith('@') ? formData.creator_handle : `@${formData.creator_handle}`}</span>
                          </div>
                        )}
                        
                        <div className="flex gap-3 text-sm">
                          {formData.views_count > 0 && (
                            <div className="flex items-center gap-1">
                              <EyeIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-300">{formatNumber(formData.views_count)}</span>
                            </div>
                          )}
                          {formData.likes_count > 0 && (
                            <div className="flex items-center gap-1">
                              <HeartIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-300">{formatNumber(formData.likes_count)}</span>
                            </div>
                          )}
                          {formData.comments_count > 0 && (
                            <div className="flex items-center gap-1">
                              <CommentIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-300">{formatNumber(formData.comments_count)}</span>
                            </div>
                          )}
                        </div>
                        
                        {formData.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {formData.hashtags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-xs bg-blue-900/30 px-2 py-1 rounded text-blue-400">
                                #{tag}
                              </span>
                            ))}
                            {formData.hashtags.length > 3 && (
                              <span className="text-xs text-gray-500">+{formData.hashtags.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Right side - thumbnail with upload */}
                      <div className="flex justify-end">
                        {formData.thumbnail_url ? (
                          <div className="relative">
                            <img 
                              src={formData.thumbnail_url} 
                              alt="Trend thumbnail"
                              className="w-24 h-24 object-cover rounded-lg border border-gray-700 shadow-lg"
                            />
                          </div>
                        ) : (
                          <label className="w-24 h-24 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Convert to base64 for immediate display
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setFormData(prev => ({ 
                                      ...prev, 
                                      thumbnail_url: reader.result as string 
                                    }));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <div className="text-center">
                              <CameraIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                              <p className="text-xs text-gray-400">Tap to add</p>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Title Input with Writing Helper */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Write a headline-style title <span className="text-red-400">*</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Think like a news headline: "Retail investors are jumping on this meme stock"
                  </p>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder='e.g., "Gaming community going crazy over AI-generated RPG"'
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                  
                  {/* Integrated Writing Helper */}
                  <TrendWritingHelper
                    value={formData.title}
                    onChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
                    category={formData.platform || 'General'}
                    showInline={true}
                  />
                </div>

                {/* Platform indicator */}
                {formData.platform && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <GlobeIcon className="w-4 h-4" />
                    <span>Detected platform: {formData.platform}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Velocity & Size (HIGH VALUE DATA) */}
            {currentStep === 'velocity' && (
              <motion.div
                key="velocity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Trend Velocity */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">How fast is this trend moving?</h3>
                  <p className="text-sm text-gray-400 mb-4">This helps us identify market opportunities</p>
                  
                  <div className="space-y-2">
                    {[
                      { value: 'just_starting', label: '🌱 Just Starting', desc: 'Brand new, very few people know' },
                      { value: 'picking_up', label: '📈 Picking Up', desc: 'Gaining traction, growing steadily' },
                      { value: 'viral', label: '🚀 Going Viral', desc: 'Explosive growth, spreading everywhere' },
                      { value: 'saturated', label: '⚡ Saturated', desc: 'Peak reached, maximum visibility' },
                      { value: 'declining', label: '📉 Declining', desc: 'Losing momentum, past its prime' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData(prev => ({ ...prev, trendVelocity: option.value as any }))}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          formData.trendVelocity === option.value
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{option.label.split(' ')[0]}</span>
                          <div className="flex-1">
                            <div className="font-medium text-white">{option.label.split(' ').slice(1).join(' ')}</div>
                            <div className="text-sm text-gray-400 mt-0.5">{option.desc}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sentiment for Velocity */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">How do you feel about this trend's momentum?</h4>
                  <SentimentSlider
                    value={formData.sentiment}
                    onChange={(value) => setFormData(prev => ({ ...prev, sentiment: value }))}
                  />
                </div>

                {/* Trend Size */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">How big is this trend?</h3>
                  <p className="text-sm text-gray-400 mb-4">Based on engagement and reach</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      { value: 'micro', label: '🔬 Micro', desc: '<10K views/likes' },
                      { value: 'niche', label: '🎯 Niche', desc: '10K-100K engagement' },
                      { value: 'viral', label: '🔥 Viral', desc: '100K-1M engagement' },
                      { value: 'mega', label: '💥 Mega', desc: '1M-10M engagement' },
                      { value: 'global', label: '🌍 Global', desc: '10M+ engagement' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData(prev => ({ ...prev, trendSize: option.value as any }))}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          formData.trendSize === option.value
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{option.label.split(' ')[0]}</span>
                          <div className="flex-1">
                            <div className="font-medium text-white text-sm">{option.label.substring(3)}</div>
                            <div className="text-xs text-gray-400">{option.desc}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* When First Seen */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">When did you first see this?</h3>
                  <p className="text-sm text-gray-400 mb-4">Timing is crucial for trend value</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { value: 'today', label: 'Today', icon: '🆕' },
                      { value: 'yesterday', label: 'Yesterday', icon: '📅' },
                      { value: 'this_week', label: 'This Week', icon: '📆' },
                      { value: 'last_week', label: 'Last Week', icon: '📊' },
                      { value: 'older', label: 'Older', icon: '📚' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData(prev => ({ ...prev, firstSeen: option.value as any }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.firstSeen === option.value
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-1">{option.icon}</div>
                          <div className="font-medium text-white text-sm">{option.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Category Selection */}
            {currentStep === 'category' && (
              <motion.div
                key="category"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">What type of trend is this?</h3>
                  <p className="text-sm text-gray-400 mb-4">This helps us ask the right follow-up questions</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className="group relative p-4 rounded-xl border border-gray-700 hover:border-blue-500 bg-gray-800/50 hover:bg-gray-800 transition-all text-left"
                    >
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                      <div className="relative">
                        <div className="text-2xl mb-2">{cat.icon}</div>
                        <div className="font-medium text-white text-sm">{cat.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 4: Category-Specific Details */}
            {currentStep === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Category header */}
                {getSelectedCategory() && (
                  <div className={`bg-gradient-to-r ${getSelectedCategory()!.color} p-4 rounded-lg`}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getSelectedCategory()!.icon}</span>
                      <div>
                        <h3 className="text-white font-semibold text-lg">{getSelectedCategory()!.label}</h3>
                        <p className="text-white/80 text-sm">Answer a few specific questions</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Category-specific questions */}
                {getSelectedCategory()?.questions && (
                  <div className="space-y-4">
                    {Object.entries(getSelectedCategory()!.questions).map(([key, question]) => (
                      <div key={key}>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                          {question.label}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {question.options.map((option: string) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                categoryAnswers: { ...prev.categoryAnswers, [key]: option }
                              }))}
                              className={`p-2.5 rounded-lg border text-sm transition-all ${
                                formData.categoryAnswers[key] === option
                                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                                  : 'border-gray-700 text-gray-300 hover:border-gray-600'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Why trending */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Why is this trending? (Be specific)
                  </label>
                  <textarea
                    value={formData.whyTrending}
                    onChange={(e) => setFormData(prev => ({ ...prev, whyTrending: e.target.value }))}
                    rows={3}
                    placeholder="e.g., 'People are using this sound to show their morning routines but in a chaotic way'"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Audience age */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Who's into this? (select all that apply)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Gen Alpha (9-14)', 'Gen Z (15-24)', 'Millennials (25-40)', 'Gen X+ (40+)'].map((age) => (
                      <button
                        key={age}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            audienceAge: prev.audienceAge.includes(age)
                              ? prev.audienceAge.filter(a => a !== age)
                              : [...prev.audienceAge, age]
                          }));
                        }}
                        className={`p-2.5 rounded-lg border text-sm transition-all ${
                          formData.audienceAge.includes(age)
                            ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                            : 'border-gray-700 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        {age}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brand Safety */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Is this content brand-safe?
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, brandSafe: true }))}
                      className={`flex-1 py-3 rounded-lg border text-sm transition-all ${
                        formData.brandSafe === true
                          ? 'border-green-500 bg-green-500/10 text-green-300'
                          : 'border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      ✅ Yes - Appropriate for all audiences
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, brandSafe: false }))}
                      className={`flex-1 py-3 rounded-lg border text-sm transition-all ${
                        formData.brandSafe === false
                          ? 'border-red-500 bg-red-500/10 text-red-300'
                          : 'border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      ⚠️ No - Contains mature content
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Review */}
            {currentStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Review Your Submission</h3>
                
                {/* Summary cards */}
                <div className="space-y-3">
                  {/* Basic info with thumbnail */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Trend Info</h4>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <p className="text-white font-medium">{formData.title}</p>
                        <p className="text-sm text-gray-400">{formData.url}</p>
                        {formData.creator_handle && (
                          <p className="text-sm text-gray-400">by {formData.creator_handle.startsWith('@') ? formData.creator_handle : `@${formData.creator_handle}`}</p>
                        )}
                      </div>
                      {formData.thumbnail_url && (
                        <img 
                          src={formData.thumbnail_url} 
                          alt="Trend thumbnail"
                          className="w-20 h-20 object-cover rounded-lg border border-gray-700"
                        />
                      )}
                    </div>
                  </div>

                  {/* Velocity & Timing (HIGH VALUE DATA) */}
                  <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-lg p-4 border border-green-800/30">
                    <h4 className="text-sm font-medium text-green-400 mb-2">📊 Market Intelligence</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-400">Velocity</p>
                        <p className="text-sm font-medium text-white capitalize">
                          {formData.trendVelocity === 'just_starting' && '🌱 Just Starting'}
                          {formData.trendVelocity === 'picking_up' && '📈 Picking Up'}
                          {formData.trendVelocity === 'viral' && '🚀 Going Viral'}
                          {formData.trendVelocity === 'saturated' && '⚡ Saturated'}
                          {formData.trendVelocity === 'declining' && '📉 Declining'}
                          {!formData.trendVelocity && 'Not selected'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Size</p>
                        <p className="text-sm font-medium text-white capitalize">
                          {formData.trendSize === 'micro' && '🔬 Micro'}
                          {formData.trendSize === 'niche' && '🎯 Niche'}
                          {formData.trendSize === 'viral' && '🔥 Viral'}
                          {formData.trendSize === 'mega' && '💥 Mega'}
                          {formData.trendSize === 'global' && '🌍 Global'}
                          {!formData.trendSize && 'Not selected'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">First Seen</p>
                        <p className="text-sm font-medium text-white capitalize">
                          {formData.firstSeen.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Category & answers */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Category Analysis</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getSelectedCategory()?.icon}</span>
                      <span className="text-white font-medium">{getSelectedCategory()?.label}</span>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(formData.categoryAnswers).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-500">{key}: </span>
                          <span className="text-gray-300">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Why trending */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Why It's Trending</h4>
                    <p className="text-gray-300 text-sm">{formData.whyTrending}</p>
                  </div>

                  {/* Stats */}
                  {(formData.views_count > 0 || formData.likes_count > 0) && (
                    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-4 border border-blue-800/30">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Engagement</h4>
                      <div className="flex gap-4">
                        {formData.views_count > 0 && (
                          <div>
                            <p className="text-2xl font-bold text-white">{formatNumber(formData.views_count)}</p>
                            <p className="text-xs text-gray-400">views</p>
                          </div>
                        )}
                        {formData.likes_count > 0 && (
                          <div>
                            <p className="text-2xl font-bold text-white">{formatNumber(formData.likes_count)}</p>
                            <p className="text-xs text-gray-400">likes</p>
                          </div>
                        )}
                        {formData.comments_count > 0 && (
                          <div>
                            <p className="text-2xl font-bold text-white">{formatNumber(formData.comments_count)}</p>
                            <p className="text-xs text-gray-400">comments</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sentiment Analysis */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Trend Sentiment</h4>
                    <SentimentSlider
                      value={formData.sentiment}
                      onChange={(value) => setFormData(prev => ({ ...prev, sentiment: value }))}
                    />
                  </div>

                  {/* AI-Generated Content Disclosure */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="ai-generated"
                        checked={formData.is_ai_generated}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_ai_generated: e.target.checked }))}
                        className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <label htmlFor="ai-generated" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <SparklesIcon className="w-4 h-4 text-yellow-400" />
                          <h4 className="text-sm font-medium text-gray-300">AI-Generated Content</h4>
                        </div>
                        <p className="text-xs text-gray-400">
                          Check this box if this trend involves AI-generated content (images, videos, text, music, etc.)
                        </p>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2"
            >
              <AlertCircleIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 bg-gray-900/50">
          <div className="flex justify-between items-center">
            {currentStep !== 'url' ? (
              <button
                onClick={handleBack}
                className="px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-gray-300"
              >
                Back
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all text-gray-300"
              >
                Cancel
              </button>
            )}
            
            {currentStep === 'review' ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all text-white font-medium flex items-center gap-2 disabled:opacity-50"
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
            ) : currentStep === 'category' ? (
              <p className="text-sm text-gray-400">Select a category to continue</p>
            ) : (
              <button
                onClick={handleNext}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-all text-white font-medium flex items-center gap-2"
              >
                Next
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}