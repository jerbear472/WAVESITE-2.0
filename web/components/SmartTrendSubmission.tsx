'use client';

import { useState, useEffect, useRef } from 'react';
import SentimentSlider from './SentimentSlider';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
import { 
  calculateTrendEarnings, 
  SUSTAINABLE_EARNINGS,
  isWithinSessionWindow
} from '@/lib/SUSTAINABLE_EARNINGS';
import { MetadataExtractor } from '@/lib/metadataExtractorSafe';
import { getUltraSimpleThumbnail } from '@/lib/ultraSimpleThumbnail';
import { calculateWaveScore } from '@/lib/calculateWaveScore';
import { 
  Link as LinkIcon,
  Send as SendIcon,
  X as XIcon,
  X,
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
  Heart as HealthIcon,
  Trash2 as TrashIcon,
  Coins
} from 'lucide-react';

// Quality scoring functions
const calculateDescriptionQuality = (description: string): number => {
  let score = 0;
  
  // Length bonus (10-30 points)
  const wordCount = description.split(/\s+/).length;
  if (wordCount >= 10) score += 10;
  if (wordCount >= 20) score += 10;
  if (wordCount >= 30) score += 10;
  
  // Specificity checks (20 points)
  const hasNumbers = /\d+/.test(description);
  const hasPlatform = /tiktok|instagram|youtube|twitter|reddit|threads|x\.com/i.test(description);
  if (hasNumbers) score += 10;
  if (hasPlatform) score += 10;
  
  // Action verbs (20 points)
  const actionVerbs = ['pranking', 'dancing', 'creating', 'posting', 'sharing', 'remixing', 
                       'jumping', 'reacting', 'building', 'launching', 'going', 'making',
                       'flooding', 'exploding', 'surging', 'transforming', 'disrupting'];
  const hasActionVerb = actionVerbs.some(verb => description.toLowerCase().includes(verb));
  if (hasActionVerb) score += 20;
  
  // Humor/Personality (10 points)
  const humorWords = ['hilarious', 'funny', 'lol', 'crazy', 'wild', 'insane', 'unhinged',
                      'chaotic', 'legendary', 'iconic', 'viral', 'broke the internet'];
  const hasHumor = humorWords.some(word => description.toLowerCase().includes(word));
  if (hasHumor) score += 10;
  
  // Explanation quality (10 points)
  const hasWhy = /because|since|due to|thanks to|after/i.test(description);
  if (hasWhy) score += 10;
  
  return Math.min(score, 100);
};

// Quality Indicators Component
const QualityIndicators = ({ description }: { description: string }) => {
  const wordCount = description.split(/\s+/).length;
  const hasNumbers = /\d+/.test(description);
  const hasPlatform = /tiktok|instagram|youtube|twitter|reddit|threads|x\.com/i.test(description);
  const actionVerbs = ['pranking', 'dancing', 'creating', 'posting', 'sharing', 'remixing', 
                       'jumping', 'reacting', 'building', 'launching', 'going', 'making',
                       'flooding', 'exploding', 'surging', 'transforming', 'disrupting'];
  const hasActionVerb = actionVerbs.some(verb => description.toLowerCase().includes(verb));
  const humorWords = ['hilarious', 'funny', 'lol', 'crazy', 'wild', 'insane', 'unhinged',
                      'chaotic', 'legendary', 'iconic', 'viral', 'broke the internet'];
  const hasHumor = humorWords.some(word => description.toLowerCase().includes(word));
  const hasWhy = /because|since|due to|thanks to|after/i.test(description);
  
  const qualityScore = calculateDescriptionQuality(description);
  const xpBonus = Math.floor(qualityScore / 2); // Up to 50 bonus XP
  
  return (
    <div className="space-y-2">
      {/* XP Preview */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-800/30">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-400" />
          <span className="text-sm font-medium text-white">Quality Bonus XP</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-yellow-400">+{xpBonus}</span>
          <span className="text-xs text-gray-400">/ 50 max</span>
        </div>
      </div>
      
      {/* Quality Checklist */}
      <div className="grid grid-cols-2 gap-2">
        <QualityCheck 
          met={wordCount >= 20} 
          label="20+ words" 
          icon={<Hash className="w-3 h-3" />}
        />
        <QualityCheck 
          met={hasPlatform} 
          label="Platform mentioned" 
          icon={<Globe className="w-3 h-3" />}
        />
        <QualityCheck 
          met={hasActionVerb} 
          label="Action verb" 
          icon={<Zap className="w-3 h-3" />}
        />
        <QualityCheck 
          met={hasNumbers} 
          label="Specific numbers" 
          icon={<TrendingUp className="w-3 h-3" />}
        />
        <QualityCheck 
          met={hasHumor} 
          label="Personality/Humor" 
          icon={<Sparkles className="w-3 h-3" />}
        />
        <QualityCheck 
          met={hasWhy} 
          label="Explains why" 
          icon={<AlertCircle className="w-3 h-3" />}
        />
      </div>
    </div>
  );
};

const QualityCheck = ({ met, label, icon }: { met: boolean; label: string; icon: React.ReactNode }) => (
  <div className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
    met ? 'bg-green-900/20 border border-green-800/30' : 'bg-gray-800/30 border border-gray-700/30'
  }`}>
    <div className={`${met ? 'text-green-400' : 'text-gray-500'}`}>
      {met ? <CheckIcon className="w-4 h-4" /> : icon}
    </div>
    <span className={`text-xs ${met ? 'text-green-400' : 'text-gray-500'}`}>
      {label}
    </span>
  </div>
);

interface SmartTrendSubmissionProps {
  onClose: () => void;
  onSubmit?: (data: any) => Promise<void>;
  initialUrl?: string;
}

interface TrendFormData {
  url: string;
  platform: string;
  title: string;
  creator_handle: string;
  creator_name: string;
  post_caption: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  hashtags: string[];
  thumbnail_url: string;
  posted_at: string;
  category: string;
  categoryAnswers: Record<string, string>;
  audienceAge: string[];
  predictedPeak: string;
  aiAngle: 'using_ai' | 'reacting_to_ai' | 'ai_tool_viral' | 'ai_technique' | 'anti_ai' | 'not_ai' | '';
  trendVelocity: 'just_starting' | 'picking_up' | 'viral' | 'saturated' | 'declining' | '';
  sentiment: number;
  trendSize: 'micro' | 'niche' | 'viral' | 'mega' | 'global' | '';
  description: string;
  audience_demographic: string;
  behavior_insight: string;
  wave_score: number;
}

// Map UI categories to database-accepted categories
const mapCategoryToDatabase = (uiCategory: string): string => {
  const mapping: Record<string, string> = {
    'meme': 'meme_format',
    'fashion': 'visual_style',
    'food': 'behavior_pattern',
    'music': 'audio_music',
    'lifestyle': 'behavior_pattern',
    'tech': 'creator_technique',
    'finance': 'behavior_pattern',
    'sports': 'behavior_pattern',
    'political': 'behavior_pattern',
    'cars': 'product_brand',
    'animals': 'behavior_pattern',
    'travel': 'behavior_pattern',
    'education': 'creator_technique',
    'science': 'creator_technique',
    'entertainment': 'visual_style',
    'art': 'visual_style',
    'relationships': 'behavior_pattern',
    'health': 'behavior_pattern',
  };
  
  return mapping[uiCategory] || 'behavior_pattern'; // Default to behavior_pattern
};

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

export default function SmartTrendSubmission(props: SmartTrendSubmissionProps) {
  const { onClose, onSubmit: customSubmit, initialUrl = '' } = props;
  const { user } = useAuth();
  const { logTrendSubmission, isSessionActive, session } = useSession();
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{ show: boolean; xp: number } | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const extractionTimeoutRef = useRef<NodeJS.Timeout>();
  
  const showEarnings = (xp: number) => {
    setNotification({ show: true, xp });
    setTimeout(() => setNotification(null), 3000);
  };
  
  const dismissNotification = () => setNotification(null);
  
  // Form state
  const [currentStep, setCurrentStep] = useState<'url' | 'velocity' | 'category' | 'details' | 'review'>('url');
  // Autosave key
  const AUTOSAVE_KEY = 'smart_trend_submission_draft';
  
  // Load saved data from localStorage
  const loadSavedData = (): TrendFormData | null => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only use saved data if it's less than 24 hours old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      }
    } catch (e) {
      console.error('Failed to load saved form data:', e);
    }
    return null;
  };

  const [formData, setFormData] = useState<TrendFormData>(() => {
    const savedData = loadSavedData();
    // If we loaded saved data, show a notification
    if (savedData) {
      setTimeout(() => {
        setShowSavedNotification(true);
        setLastSaved(new Date());
        setTimeout(() => setShowSavedNotification(false), 3000);
      }, 500);
    }
    return savedData || {
      // URL & Metadata
      url: initialUrl || '',
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
      audienceAge: [] as string[],
      predictedPeak: '',
      aiAngle: '' as 'using_ai' | 'reacting_to_ai' | 'ai_tool_viral' | 'ai_technique' | 'anti_ai' | 'not_ai' | '',
      
      // Velocity & Size (HIGH VALUE DATA)
      trendVelocity: '' as 'just_starting' | 'picking_up' | 'viral' | 'saturated' | 'declining' | '',
      sentiment: 50,
      trendSize: '' as 'micro' | 'niche' | 'viral' | 'mega' | 'global' | '',
      
      // User description fields
      description: '',
      audience_demographic: '',
      behavior_insight: '',
      
      // Calculated
      wave_score: 50
    };
  });
  
  // Metadata display state
  const [metadata, setMetadata] = useState<any>(null);
  const [metadataError, setMetadataError] = useState('');
  
  // Autosave state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Autosave effect - save form data to localStorage
  useEffect(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    
    // Only autosave if there's meaningful data
    if (formData.url || formData.title || formData.category) {
      autosaveTimeoutRef.current = setTimeout(() => {
        try {
          const dataToSave = {
            data: formData,
            timestamp: Date.now()
          };
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(dataToSave));
          setLastSaved(new Date());
          setShowSavedNotification(true);
          
          // Hide notification after 2 seconds
          setTimeout(() => setShowSavedNotification(false), 2000);
        } catch (e) {
          console.error('Failed to autosave:', e);
        }
      }, 2000); // Autosave after 2 seconds of no changes
    }
    
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [formData]);

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
        if (!formData.title || formData.title.trim().length < 10) {
          setError('Please add a quality description (at least 10 characters)');
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

  const clearSavedDraft = () => {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
      setLastSaved(null);
    } catch (e) {
      console.error('Failed to clear saved draft:', e);
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
    console.log('Submit clicked');
    setLoading(true);
    
    try {
      if (customSubmit) {
        await customSubmit(formData);
      }
      
      setLoading(false);
      onClose();
    } catch (error: any) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Earnings Notification - shows in bottom-left corner */}
      <AnimatePresence>
        {notification?.show && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-4 left-4 z-50"
          >
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
              <Coins className="w-6 h-6" />
              <div>
                <p className="font-bold text-lg">+{notification.xp} XP Earned!</p>
                <p className="text-sm opacity-90">Great spot, Cultural Anthropologist!</p>
              </div>
              <button
                onClick={dismissNotification}
                className="ml-4 p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Spot Cultural Wave</h2>
                <p className="text-xs text-gray-400">
                  {currentStep === 'url' && 'Earn up to 200 XP'}
                  {currentStep === 'velocity' && 'Predict the trend trajectory'}
                  {currentStep === 'category' && 'Categorize for bonus XP'}
                  {currentStep === 'details' && `Complete for ${getSelectedCategory()?.label} expertise`}
                  {currentStep === 'review' && 'Finalize your submission'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Autosave indicator */}
              <AnimatePresence>
                {showSavedNotification && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-lg"
                  >
                    <CheckIcon className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">Saved</span>
                  </motion.div>
                )}
              </AnimatePresence>
              {lastSaved && !showSavedNotification && (
                <span className="text-xs text-gray-500">
                  Draft saved
                </span>
              )}
              {/* Clear draft button if there's saved data */}
              {lastSaved && (
                <button
                  onClick={() => {
                    if (confirm('Clear all saved form data?')) {
                      clearSavedDraft();
                      // Reset form to initial state
                      setFormData({
                        url: initialUrl || '',
                        platform: '',
                        title: '',
                        creator_handle: '',
                        creator_name: '',
                        post_caption: '',
                        likes_count: 0,
                        comments_count: 0,
                        views_count: 0,
                        hashtags: [],
                        thumbnail_url: '',
                        posted_at: '',
                        category: '',
                        categoryAnswers: {},
                        audienceAge: [],
                        predictedPeak: '',
                        aiAngle: '',
                        trendVelocity: '',
                        sentiment: 50,
                        trendSize: '',
                        description: '',
                        audience_demographic: '',
                        behavior_insight: '',
                        wave_score: 50
                      });
                      setCurrentStep('url');
                    }
                  }}
                  className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors group"
                  title="Clear saved draft"
                >
                  <TrashIcon className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <XIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
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
                {/* XP Potential Banner */}
                <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 p-4 rounded-lg border border-yellow-800/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-yellow-400">Total XP Available</h3>
                      <p className="text-xs text-gray-400 mt-1">Base + Quality + Accuracy Bonuses</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-yellow-400">200</div>
                      <div className="text-xs text-gray-400">max XP</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-800/50 rounded p-2">
                      <div className="text-yellow-400 font-semibold">30 XP</div>
                      <div className="text-gray-400">Base submission</div>
                    </div>
                    <div className="bg-gray-800/50 rounded p-2">
                      <div className="text-blue-400 font-semibold">+50 XP</div>
                      <div className="text-gray-400">Quality bonus</div>
                    </div>
                    <div className="bg-gray-800/50 rounded p-2">
                      <div className="text-purple-400 font-semibold">+120 XP</div>
                      <div className="text-gray-400">If validated</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Trend URL <span className="text-red-400">*</span>
                    <span className="ml-2 text-xs text-yellow-400">+30 base XP</span>
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

                {/* Quality Description Input */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Describe this trend <span className="text-red-400">*</span>
                    <span className="ml-2 text-xs text-blue-400">+50 XP for quality description</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Be specific! Use action verbs, mention the platform, explain why it's trending
                  </p>
                  <textarea
                    value={formData.title}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, title: e.target.value }));
                      // Calculate quality score as user types
                      calculateDescriptionQuality(e.target.value);
                    }}
                    placeholder="e.g., TikTok creators are pranking their pets with cucumber filters, causing millions of confused cat reactions that are going mega-viral because the cats genuinely think they're snakes"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none min-h-[100px] resize-y"
                    rows={3}
                  />
                  
                  {/* Quality Indicators */}
                  {formData.title && (
                    <div className="mt-3 space-y-2">
                      <QualityIndicators description={formData.title} />
                    </div>
                  )}
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

                {/* Peak Prediction */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">When will this trend peak? 📊</h3>
                  <p className="text-sm text-gray-400 mb-4">Your prediction helps us track trend lifecycles</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: '24_hours', label: '⚡ Next 24 hours', desc: 'Viral flash trend' },
                      { value: '3_days', label: '🔥 2-3 days', desc: 'Quick burn' },
                      { value: '1_week', label: '📈 Within a week', desc: 'Standard cycle' },
                      { value: '2_weeks', label: '🎯 1-2 weeks', desc: 'Building momentum' },
                      { value: '1_month', label: '🚀 2-4 weeks', desc: 'Sustained growth' },
                      { value: '3_months', label: '💫 1-3 months', desc: 'Long-term trend' },
                      { value: '6_months', label: '🌊 3-6 months', desc: 'Cultural shift' },
                      { value: 'already_peaked', label: '📉 Already peaked', desc: 'Past prime' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData(prev => ({ ...prev, predictedPeak: option.value }))}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          formData.predictedPeak === option.value
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                        }`}
                      >
                        <div className="flex flex-col">
                          <div className="font-medium text-white text-sm">{option.label}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{option.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Prediction confidence indicator */}
                  {formData.predictedPeak && (
                    <div className="mt-3 p-3 bg-purple-900/20 rounded-lg border border-purple-800/30">
                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-purple-300">
                          Peak prediction recorded: {
                            formData.predictedPeak === '24_hours' ? 'Next 24 hours' :
                            formData.predictedPeak === '3_days' ? '2-3 days' :
                            formData.predictedPeak === '1_week' ? 'Within a week' :
                            formData.predictedPeak === '2_weeks' ? '1-2 weeks' :
                            formData.predictedPeak === '1_month' ? '2-4 weeks' :
                            formData.predictedPeak === '3_months' ? '1-3 months' :
                            formData.predictedPeak === '6_months' ? '3-6 months' :
                            'Already peaked'
                          }
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        We'll track this prediction and show your accuracy over time
                      </p>
                    </div>
                  )}
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

                {/* AI Adoption Signal - HIGH VALUE */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    What's the AI angle here? 🤖
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'using_ai', label: 'People using AI to create', icon: '🎨' },
                      { value: 'reacting_to_ai', label: 'People reacting to AI', icon: '😮' },
                      { value: 'ai_tool_viral', label: 'AI tool going viral', icon: '🚀' },
                      { value: 'ai_technique', label: 'AI technique/prompt sharing', icon: '💡' },
                      { value: 'anti_ai', label: 'Anti-AI backlash', icon: '🚫' },
                      { value: 'not_ai', label: 'Not AI-related', icon: '👤' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, aiAngle: option.value as any }))}
                        className={`p-2.5 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                          formData.aiAngle === option.value
                            ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                            : 'border-gray-700 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <span>{option.icon}</span>
                        <span className="text-left flex-1">{option.label}</span>
                      </button>
                    ))}
                  </div>
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
                <h3 className="text-lg font-semibold text-white mb-4">Review & Earn XP</h3>
                
                {/* XP Summary */}
                <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 p-4 rounded-lg border border-yellow-800/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-yellow-400">Your XP Breakdown</h4>
                    <div className="text-2xl font-bold text-yellow-400">
                      {(() => {
                        const qualityBonus = Math.floor(calculateDescriptionQuality(formData.title) / 2);
                        const velocityBonus = formData.trendVelocity && formData.trendSize ? 20 : 0;
                        const predictionBonus = formData.predictedPeak ? 15 : 0;
                        const categoryBonus = Object.keys(formData.categoryAnswers).length >= 2 ? 15 : 0;
                        return 30 + qualityBonus + velocityBonus + predictionBonus + categoryBonus;
                      })()} XP
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Base submission</span>
                      <span className="text-white">30 XP</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Description quality</span>
                      <span className="text-blue-400">+{Math.floor(calculateDescriptionQuality(formData.title) / 2)} XP</span>
                    </div>
                    {formData.trendVelocity && formData.trendSize && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Velocity data</span>
                        <span className="text-green-400">+20 XP</span>
                      </div>
                    )}
                    {formData.predictedPeak && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Peak prediction</span>
                        <span className="text-purple-400">+15 XP</span>
                      </div>
                    )}
                    {Object.keys(formData.categoryAnswers).length >= 2 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Category details</span>
                        <span className="text-orange-400">+15 XP</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-400">
                      <span className="text-purple-400 font-semibold">+120 XP bonus</span> if your trend gets validated by the community!
                    </p>
                  </div>
                </div>
                
                {/* Summary cards */}
                <div className="space-y-3">
                  {/* Basic info with thumbnail */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Trend Info</h4>
                    <div className="space-y-2">
                      <p className="text-white font-medium">{formData.title}</p>
                      <p className="text-sm text-gray-400 break-all">{formData.url}</p>
                      {formData.creator_handle && (
                        <p className="text-sm text-gray-400">by {formData.creator_handle.startsWith('@') ? formData.creator_handle : `@${formData.creator_handle}`}</p>
                      )}
                      {formData.thumbnail_url && (
                        <div className="mt-3 flex justify-center">
                          <img 
                            src={formData.thumbnail_url} 
                            alt="Trend thumbnail"
                            className="max-w-full h-auto max-h-60 object-contain rounded-lg border border-gray-700"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Velocity & Timing (HIGH VALUE DATA) */}
                  <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-lg p-4 border border-green-800/30">
                    <h4 className="text-sm font-medium text-green-400 mb-2">📊 Market Intelligence</h4>
                    <div className="grid grid-cols-2 gap-3">
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
                    </div>
                    {/* Peak Prediction */}
                    {formData.predictedPeak && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs text-gray-400">Peak Prediction</p>
                        <p className="text-sm font-medium text-purple-400">
                          {formData.predictedPeak === '24_hours' ? '⚡ Next 24 hours' :
                           formData.predictedPeak === '3_days' ? '🔥 2-3 days' :
                           formData.predictedPeak === '1_week' ? '📈 Within a week' :
                           formData.predictedPeak === '2_weeks' ? '🎯 1-2 weeks' :
                           formData.predictedPeak === '1_month' ? '🚀 2-4 weeks' :
                           formData.predictedPeak === '3_months' ? '💫 1-3 months' :
                           formData.predictedPeak === '6_months' ? '🌊 3-6 months' :
                           '📉 Already peaked'}
                        </p>
                      </div>
                    )}
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

                  {/* AI Signal if selected */}
                  {formData.aiAngle && formData.aiAngle !== 'not_ai' && (
                    <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg p-4 border border-purple-800/30">
                      <h4 className="text-sm font-medium text-purple-400 mb-2">🤖 AI Signal</h4>
                      <p className="text-white font-medium">
                        {formData.aiAngle === 'using_ai' && 'People using AI to create content'}
                        {formData.aiAngle === 'reacting_to_ai' && 'People reacting to AI content'}
                        {formData.aiAngle === 'ai_tool_viral' && 'AI tool going viral'}
                        {formData.aiAngle === 'ai_technique' && 'AI technique/prompt sharing'}
                        {formData.aiAngle === 'anti_ai' && 'Anti-AI backlash'}
                      </p>
                    </div>
                  )}

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
          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircleIcon className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}
          
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
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 transition-all text-white font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    Submit & Earn {(() => {
                      const qualityBonus = Math.floor(calculateDescriptionQuality(formData.title) / 2);
                      const velocityBonus = formData.trendVelocity && formData.trendSize ? 20 : 0;
                      const predictionBonus = formData.predictedPeak ? 15 : 0;
                      const categoryBonus = Object.keys(formData.categoryAnswers).length >= 2 ? 15 : 0;
                      return 30 + qualityBonus + velocityBonus + predictionBonus + categoryBonus;
                    })()} XP
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
      </AnimatePresence>
    </>
  );
}