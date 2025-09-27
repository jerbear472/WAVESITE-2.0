'use client';

import { useState, useEffect, useRef } from 'react';
import SentimentSlider from './SentimentSlider';
import TrendResonanceAnalysis from './TrendResonanceAnalysis';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
import { useXPNotification } from '@/contexts/XPNotificationContext';
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

// Catchy title scoring functions
const calculateTitleCatchiness = (title: string): number => {
  let score = 30; // Start lenient with base score
  
  // Length bonus - catchy titles are usually concise but descriptive (5-15 words)
  const wordCount = title.split(/\s+/).length;
  if (wordCount >= 5 && wordCount <= 15) score += 20;
  else if (wordCount >= 3 && wordCount <= 20) score += 10;
  
  // Catchy words and phrases (high impact)
  const catchyWords = [
    'viral', 'trending', 'exploding', 'breaking', 'shocking', 'mind-blowing', 'insane',
    'crazy', 'wild', 'epic', 'legendary', 'iconic', 'game-changing', 'revolutionary',
    'unstoppable', 'massive', 'huge', 'gigantic', 'ultimate', 'secret', 'forbidden',
    'exposed', 'revealed', 'mystery', 'bizarre', 'weird', 'strange', 'unbelievable',
    'incredible', 'amazing', 'genius', 'brilliant', 'masterpiece', 'phenomenon'
  ];
  const catchyWordsFound = catchyWords.filter(word => 
    title.toLowerCase().includes(word.toLowerCase())
  ).length;
  score += Math.min(catchyWordsFound * 15, 30); // Up to 30 points for catchy words
  
  // Power phrases that make titles compelling
  const powerPhrases = [
    'you won\'t believe', 'will blow your mind', 'breaks the internet', 'going viral',
    'everyone is', 'nobody talks about', 'secret that', 'truth about', 'real reason',
    'what happens when', 'the moment when', 'why everyone', 'how to', 'this is why'
  ];
  const hasPowerPhrase = powerPhrases.some(phrase => 
    title.toLowerCase().includes(phrase.toLowerCase())
  );
  if (hasPowerPhrase) score += 20;
  
  // Emotional hooks
  const emotions = ['love', 'hate', 'obsessed', 'addicted', 'shocked', 'surprised', 'terrified', 'excited'];
  const hasEmotion = emotions.some(emotion => title.toLowerCase().includes(emotion));
  if (hasEmotion) score += 15;
  
  // Numbers in titles (clickbait factor)
  if (/\d+/.test(title)) score += 10;
  
  return Math.min(score, 100);
};

// Catchiness Indicators Component
const CatchinessIndicators = ({ title }: { title: string }) => {
  const wordCount = title.split(/\s+/).length;
  const hasNumbers = /\d+/.test(title);
  
  const catchyWords = [
    'viral', 'trending', 'exploding', 'breaking', 'shocking', 'mind-blowing', 'insane',
    'crazy', 'wild', 'epic', 'legendary', 'iconic', 'game-changing', 'revolutionary',
    'unstoppable', 'massive', 'huge', 'gigantic', 'ultimate', 'secret', 'forbidden',
    'exposed', 'revealed', 'mystery', 'bizarre', 'weird', 'strange', 'unbelievable',
    'incredible', 'amazing', 'genius', 'brilliant', 'masterpiece', 'phenomenon'
  ];
  const catchyWordsFound = catchyWords.filter(word => 
    title.toLowerCase().includes(word.toLowerCase())
  ).length;
  
  const powerPhrases = [
    'you won\'t believe', 'will blow your mind', 'breaks the internet', 'going viral',
    'everyone is', 'nobody talks about', 'secret that', 'truth about', 'real reason',
    'what happens when', 'the moment when', 'why everyone', 'how to', 'this is why'
  ];
  const hasPowerPhrase = powerPhrases.some(phrase => 
    title.toLowerCase().includes(phrase.toLowerCase())
  );
  
  const emotions = ['love', 'hate', 'obsessed', 'addicted', 'shocked', 'surprised', 'terrified', 'excited'];
  const hasEmotion = emotions.some(emotion => title.toLowerCase().includes(emotion));
  
  const catchinessScore = calculateTitleCatchiness(title);
  
  return (
    <div className="space-y-2">
      {/* Catchiness Meter */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-pink-600" />
          <span className="text-sm font-medium text-gray-800">Catchiness Score</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-pink-600">{catchinessScore}%</span>
          <div className={`w-3 h-3 rounded-full ${
            catchinessScore >= 80 ? 'bg-green-500' : 
            catchinessScore >= 60 ? 'bg-yellow-500' : 
            catchinessScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
          }`} />
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full transition-all duration-300 ${
            catchinessScore >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 
            catchinessScore >= 60 ? 'bg-gradient-to-r from-yellow-500 to-amber-600' : 
            catchinessScore >= 40 ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-gradient-to-r from-red-500 to-red-700'
          }`}
          style={{ width: `${catchinessScore}%` }}
        />
      </div>
      
      {/* Catchiness Checklist */}
      <div className="grid grid-cols-2 gap-2">
        <QualityCheck 
          met={wordCount >= 5 && wordCount <= 15} 
          label="Optimal length" 
          icon={<HashIcon className="w-3 h-3" />}
        />
        <QualityCheck 
          met={catchyWordsFound > 0} 
          label="Catchy words" 
          icon={<SparklesIcon className="w-3 h-3" />}
        />
        <QualityCheck 
          met={hasPowerPhrase} 
          label="Power phrase" 
          icon={<ZapIcon className="w-3 h-3" />}
        />
        <QualityCheck 
          met={hasNumbers} 
          label="Has numbers" 
          icon={<TrendingUpIcon className="w-3 h-3" />}
        />
        <QualityCheck 
          met={hasEmotion} 
          label="Emotional hook" 
          icon={<HeartIcon className="w-3 h-3" />}
        />
        <QualityCheck 
          met={catchinessScore >= 80} 
          label="Super catchy!" 
          icon={<TrophyIcon className="w-3 h-3" />}
        />
      </div>
    </div>
  );
};

const QualityCheck = ({ met, label, icon }: { met: boolean; label: string; icon: React.ReactNode }) => (
  <div className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
    met ? 'bg-green-100 border border-green-300' : 'bg-gray-100 border border-gray-300'
  }`}>
    <div className={`${met ? 'text-green-600' : 'text-gray-500'}`}>
      {met ? <CheckIcon className="w-4 h-4" /> : icon}
    </div>
    <span className={`text-xs ${met ? 'text-green-600' : 'text-gray-500'}`}>
      {label}
    </span>
  </div>
);

interface SmartTrendSubmissionProps {
  onClose: () => void;
  onSubmit?: (data: any) => Promise<any>;
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
  ai_analysis: string;
  
  // New origin and evolution fields
  drivingGeneration: 'gen_alpha' | 'gen_z' | 'millennials' | 'gen_x' | 'boomers' | '';
  trendOrigin: 'organic' | 'influencer' | 'brand' | 'ai_generated' | '';
  evolutionStatus: 'original' | 'variants' | 'parody' | 'meta' | 'final' | '';
  
  // Optional trending explanation
  whyTrending?: string;
}

// Map UI categories to database-accepted categories
const mapCategoryToDatabase = (uiCategory: string): string => {
  // Now we use the actual category names directly
  // since we've removed the deprecated field mappings
  return uiCategory || 'lifestyle';
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
        options: ['New app/tool', 'Gaming meta', 'Tech hack', 'AI thing', 'Gadget', 'Startup']
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
  const { showXPNotification } = useXPNotification();
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
  const [currentStep, setCurrentStep] = useState<'url' | 'velocity' | 'origins' | 'ai_analysis' | 'review'>('url');
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

    const blankForm: TrendFormData = {
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
      
      // New origin and evolution fields
      drivingGeneration: '' as 'gen_alpha' | 'gen_z' | 'millennials' | 'gen_x' | 'boomers' | '',
      trendOrigin: '' as 'organic' | 'influencer' | 'brand' | 'ai_generated' | '',
      evolutionStatus: '' as 'original' | 'variants' | 'parody' | 'meta' | 'final' | '',
      
      // Optional trending explanation
      whyTrending: '',
      
      // Calculated
      wave_score: 50,
      ai_analysis: ''
    };

    if (savedData) {
      setTimeout(() => {
        setShowSavedNotification(true);
        setLastSaved(new Date());
        setTimeout(() => setShowSavedNotification(false), 3000);
      }, 500);

      return {
        ...blankForm,
        ...savedData,
        ai_analysis: typeof savedData.ai_analysis === 'string' ? savedData.ai_analysis : ''
      };
    }

    return blankForm;
  });
  
  // Metadata display state
  const [metadata, setMetadata] = useState<any>(null);
  const [metadataError, setMetadataError] = useState('');
  
  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>('');
  const [aiAnalysisReady, setAiAnalysisReady] = useState(false);
  
  // Autosave state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Clear any lingering states when component mounts and unmounts
  useEffect(() => {
    console.log('📱 SmartTrendSubmission mounted');
    // Reset loading states on mount to prevent hanging
    setLoading(false);
    setExtracting(false);
    setAiLoading(false);
    setError('');
    
    // Cleanup on unmount
    return () => {
      console.log('📱 SmartTrendSubmission unmounting - cleaning up');
      setLoading(false);
      setExtracting(false);
      setAiLoading(false);
      if (extractionTimeoutRef.current) {
        clearTimeout(extractionTimeoutRef.current);
      }
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

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
      
      // Also try to get thumbnail via our improved API
      let thumbnailUrl = extractedData.thumbnail_url || '';
      let additionalMetadata: any = {};
      
      try {
        const response = await fetch('/api/extract-thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            thumbnailUrl = data.thumbnail_url || thumbnailUrl;
            additionalMetadata = data.metadata || {};
            console.log('Thumbnail extracted successfully:', thumbnailUrl);
          }
        }
      } catch (err) {
        console.log('Could not fetch thumbnail during metadata extraction:', err);
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

  const generateAiAnalysis = async () => {
    setAiLoading(true);
    setAiError('');
    setAiAnalysisReady(false);
    
    try {
      const response = await fetch('/api/analyze-trend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.error) {
        setAiError('Using contextual analysis');
      }

      const insightText = typeof data.analysis === 'string'
        ? data.analysis
        : `📱 Cultural insight captured. Continue for full analysis.`;

      setAiAnalysis(insightText);
      setFormData(prev => ({
        ...prev,
        ai_analysis: insightText
      }));
      
      // Quick display - no artificial delay
      setAiAnalysisReady(true);
      
    } catch (err) {
      console.error('Error fetching analysis:', err);
      // Provide immediate fallback - don't block submission
      const fallbackInsight = `📱 This trend is gaining momentum as people discover new ways to express themselves.
👥 **Who's in:** Early adopters are leading the charge, creating variations that keep it fresh.
💡 **The insight:** Perfect timing meets genuine need for connection and self-expression.`;
      setAiAnalysis(fallbackInsight);
      setFormData(prev => ({
        ...prev,
        ai_analysis: fallbackInsight
      }));
      setAiAnalysisReady(true);
    } finally {
      setAiLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatInsightHtml = (insight: string): string => {
    return insight
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
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
        if (!formData.category) {
          setError('Please select a category');
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
      case 'ai_analysis':
        // AI analysis automatically validates - no user input required
        break;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    
    // Scroll to top when navigating to next step
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    switch (currentStep) {
      case 'url':
        setCurrentStep('velocity');
        break;
      case 'velocity':
        setCurrentStep('ai_analysis');
        break;
      case 'ai_analysis':
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
    // Scroll to top when navigating to previous step
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    switch (currentStep) {
      case 'velocity':
        setCurrentStep('url');
        break;
      case 'ai_analysis':
        setCurrentStep('velocity');
        break;
      case 'review':
        setCurrentStep('ai_analysis');
        break;
    }
    setError('');
  };


  const resetForm = () => {
    console.log('🔄 Resetting form to initial state');
    // Reset all form state to initial values
    setFormData({
      url: initialUrl || '',
      platform: '',
      title: '',
      creator_handle: '',
      creator_name: '',
      post_caption: '',
      description: '',
      category: '',
      trendVelocity: '',
      trendSize: '',
      sentiment: 50,
      audienceAge: [],
      predictedPeak: '',
      drivingGeneration: '',
      trendOrigin: '',
      evolutionStatus: '',
      aiAngle: '',
      thumbnail_url: '',
      views_count: 0,
      likes_count: 0,
      comments_count: 0,
      hashtags: [],
      wave_score: 50,
      posted_at: '',
      audience_demographic: '',
      behavior_insight: '',
      whyTrending: '',
      ai_analysis: ''
    });
    setCurrentStep('url');
    setError('');
    setMetadata(null);
    setMetadataError('');
    setAiAnalysis('');
    setAiLoading(false);
    setAiError('');
    setAiAnalysisReady(false);
    setLoading(false); // Ensure loading is reset
    setExtracting(false); // Reset extraction state
  };

  const handleSubmit = async () => {
    console.log('🚀 Submit clicked from SmartTrendSubmission');
    console.log('Current loading state:', loading);
    console.log('Current form data:', formData);
    
    // Prevent double submission
    if (loading) {
      console.log('⚠️ Already submitting, ignoring click');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (!customSubmit) {
        throw new Error('No submit handler provided');
      }
      
      // Add reasonable timeout to prevent hanging
      const submitTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Submission timed out. Please try again.')), 30000); // 30 seconds
      });
      
      console.log('📤 Calling customSubmit with data:', formData);
      
      // Race between submission and timeout
      await Promise.race([
        customSubmit(formData),
        submitTimeout
      ]);
      
      console.log('✅ customSubmit completed successfully');
      
      // Success - clean up BEFORE closing
      clearSavedDraft();
      
      // Don't reset form here as the component will unmount
      // Just close and let the parent handle cleanup
      onClose();
      
    } catch (error: any) {
      console.error('❌ Error in handleSubmit:', error);
      
      // Better error messages
      let errorMessage = 'Failed to submit trend. Please try again.';
      
      if (error.message?.includes('timeout')) {
        errorMessage = 'Submission is taking longer than expected. Please try again.';
      } else if (error.message?.includes('category')) {
        errorMessage = 'Invalid category selected. Please choose a different category.';
      } else if (error.message?.includes('auth') || error.message?.includes('login')) {
        errorMessage = 'Session expired. Please refresh the page and log in again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  return (
    <>
      {/* Mobile viewport and accessibility styles */}
      <style jsx global>{`
        @media (max-width: 640px) {
          .trend-modal {
            height: 100vh;
            height: 100dvh;
            max-height: none;
          }
          
          /* Prevent zoom on input focus */
          input[type="text"],
          input[type="url"],
          textarea {
            font-size: 16px !important;
          }
          
          /* Improve touch targets */
          .touch-target {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
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
      
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
        <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-t-2xl sm:rounded-2xl max-w-3xl w-full trend-modal border border-gray-200 shadow-2xl flex flex-col h-[90vh] sm:max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <SendIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Submit New Trend</h2>
                <p className="text-xs text-gray-500">
                  {currentStep === 'url' && 'Paste URL and describe the trend'}
                  {currentStep === 'velocity' && 'Predict the trend trajectory'}
                  {currentStep === 'ai_analysis' && 'AI validates your discovery'}
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
                    className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-lg"
                  >
                    <CheckIcon className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600">Saved</span>
                  </motion.div>
                )}
              </AnimatePresence>
              {lastSaved && !showSavedNotification && (
                <span className="text-xs text-gray-600">
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
                        audienceAge: [],
                        predictedPeak: '',
                        aiAngle: '',
                        trendVelocity: '',
                        sentiment: 50,
                        trendSize: '',
                        description: '',
                        audience_demographic: '',
                        behavior_insight: '',
                        wave_score: 50,
                        drivingGeneration: '',
                        trendOrigin: '',
                        evolutionStatus: '',
                        ai_analysis: ''
                      });
                      setCurrentStep('url');
                    }
                  }}
                  className="p-1.5 hover:bg-red-100 rounded-lg transition-colors group"
                  title="Clear saved draft"
                >
                  <TrashIcon className="w-4 h-4 text-gray-500 group-hover:text-red-600" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <XIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">
              Step {
                currentStep === 'url' ? '1' :
                currentStep === 'velocity' ? '2' :
                currentStep === 'ai_analysis' ? '3' :
                '4'
              } of 4
            </span>
            <span className="text-xs text-gray-500">
              {
                currentStep === 'url' ? 'URL & Description' :
                currentStep === 'velocity' ? 'Trend Analysis' :
                currentStep === 'ai_analysis' ? 'AI Analysis' :
                'Review'
              }
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${(() => {
                  let progress = 0;
                  
                  // Base progress for each step
                  if (currentStep === 'url') progress = 5;
                  else if (currentStep === 'velocity') progress = 33;
                  else if (currentStep === 'ai_analysis') progress = 66;
                  else if (currentStep === 'review') progress = 90;
                  
                  // Add progress based on form completion within current step
                  if (currentStep === 'url') {
                    if (formData.url) progress += 8;
                    if (formData.title && formData.title.length >= 10) progress += 12;
                  }
                  else if (currentStep === 'velocity') {
                    if (formData.trendVelocity) progress += 10;
                    if (formData.trendSize) progress += 10;
                    if (formData.sentiment !== 50) progress += 5;
                  }
                  else if (currentStep === 'ai_analysis') {
                    if (aiAnalysisReady) progress += 15; // Analysis ready to read
                    else if (aiAnalysis) progress += 8; // Analysis generated but still in reading time
                  }
                  else if (currentStep === 'review') {
                    progress = 100; // Review step is always 100%
                  }
                  
                  return Math.min(progress, 100);
                })()}%` 
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Trend URL <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={urlInputRef}
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="Paste TikTok, Instagram, YouTube, X link..."
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none pr-10 text-base"
                      autoFocus
                    />
                    {extracting && (
                      <div className="absolute right-3 top-3.5">
                        <LoaderIcon className="w-5 h-5 text-blue-500 animate-spin" />
                      </div>
                    )}
                  </div>
                  {metadataError && (
                    <p className="text-xs text-orange-500 mt-1">{metadataError}</p>
                  )}
                </div>

                {/* Auto-extracted Metadata Display */}
                {metadata && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200"
                  >
                    <div className="flex items-center gap-2 text-green-600 text-sm mb-3">
                      <CheckIcon className="w-4 h-4" />
                      <span className="font-medium">Metadata captured automatically</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Left side - stats */}
                      <div className="space-y-2">
                        {formData.creator_handle && (
                          <div className="flex items-center gap-2 text-sm">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">{formData.creator_handle.startsWith('@') ? formData.creator_handle : `@${formData.creator_handle}`}</span>
                          </div>
                        )}
                        
                        <div className="flex gap-3 text-sm">
                          {formData.views_count > 0 && (
                            <div className="flex items-center gap-1">
                              <EyeIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">{formatNumber(formData.views_count)}</span>
                            </div>
                          )}
                          {formData.likes_count > 0 && (
                            <div className="flex items-center gap-1">
                              <HeartIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">{formatNumber(formData.likes_count)}</span>
                            </div>
                          )}
                          {formData.comments_count > 0 && (
                            <div className="flex items-center gap-1">
                              <CommentIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">{formatNumber(formData.comments_count)}</span>
                            </div>
                          )}
                        </div>
                        
                        {formData.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {formData.hashtags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-600">
                                #{tag}
                              </span>
                            ))}
                            {formData.hashtags.length > 3 && (
                              <span className="text-xs text-gray-600">+{formData.hashtags.length - 3} more</span>
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
                              className="w-24 h-24 object-cover rounded-lg border border-gray-300 shadow-lg"
                            />
                          </div>
                        ) : (
                          <label className="w-24 h-24 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
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
                              <CameraIcon className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                              <p className="text-xs text-gray-500">Tap to add</p>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Quality Description Input */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Give this trend a catchy title <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Make it clickable! Use viral words, emotional hooks, and power phrases
                  </p>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, title: e.target.value }));
                      // Calculate catchiness score as user types
                      calculateTitleCatchiness(e.target.value);
                    }}
                    placeholder="e.g., This Viral TikTok Trend Will Blow Your Mind - Millions Are Obsessed!"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none text-base"
                  />
                  
                  {/* Catchiness Indicators */}
                  {formData.title && (
                    <div className="mt-3 space-y-2">
                      <CatchinessIndicators title={formData.title} />
                    </div>
                  )}
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select a category...</option>
                    <option value="meme">😂 Meme/Humor</option>
                    <option value="fashion">👗 Fashion/Beauty</option>
                    <option value="food">🍔 Food/Drink</option>
                    <option value="music">🎵 Music/Dance</option>
                    <option value="tech">💻 Tech/Gaming</option>
                    <option value="sports">⚽ Sports/Fitness</option>
                    <option value="entertainment">🎬 Entertainment</option>
                    <option value="art">🎨 Art/Design</option>
                    <option value="travel">✈️ Travel</option>
                    <option value="education">📚 Education</option>
                    <option value="business">💼 Business</option>
                    <option value="health">💪 Health/Wellness</option>
                    <option value="pets">🐾 Pets/Animals</option>
                    <option value="diy">🔨 DIY/Crafts</option>
                    <option value="relationships">❤️ Relationships</option>
                  </select>
                </div>

                {/* Platform indicator */}
                {formData.platform && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
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
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">How fast is this trend moving?</h3>
                  <p className="text-sm text-gray-600 mb-4">This helps us identify market opportunities</p>
                  
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
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{option.label.split(' ')[0]}</span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{option.label.split(' ').slice(1).join(' ')}</div>
                            <div className="text-sm text-gray-600 mt-0.5">{option.desc}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sentiment for Velocity */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">How do you feel about this trend's momentum?</h4>
                  <SentimentSlider
                    value={formData.sentiment}
                    onChange={(value) => setFormData(prev => ({ ...prev, sentiment: value }))}
                  />
                </div>

                {/* Trend Size */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">How big is this trend?</h3>
                  <p className="text-sm text-gray-600 mb-4">Based on engagement and reach</p>
                  
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
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{option.label.split(' ')[0]}</span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 text-sm">{option.label.substring(3)}</div>
                            <div className="text-xs text-gray-600">{option.desc}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Why is this trending? (Optional) */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Why is this trending? (Optional)</h3>
                  <p className="text-sm text-gray-600 mb-3">Help us understand what makes this trend special</p>
                  
                  <textarea
                    value={formData.whyTrending || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, whyTrending: e.target.value }))}
                    placeholder="E.g., It's relatable to millennials struggling with work-life balance, uses a catchy audio that's easy to replicate, connects to a current news event..."
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none transition-colors"
                    rows={3}
                  />
                  
                  {formData.whyTrending && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium text-green-600">Great insight!</span> This helps our AI better understand trend patterns.
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* Step 3: AI Analysis - Deep Resonance Analysis */}
            {currentStep === 'ai_analysis' && (
              <motion.div
                key="ai_analysis"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <TrendResonanceAnalysis 
                  formData={formData}
                  onAnalysisComplete={(analysis) => {
                    const insight = analysis.keyInsight || 'Analysis complete';
                    // Store the key insight as the main analysis
                    setAiAnalysis(insight);
                    setAiAnalysisReady(true);
                    setFormData(prev => ({
                      ...prev,
                      ai_analysis: insight
                    }));
                    // Don't block - user can continue even if analysis is still loading
                    setLoading(false);
                  }}
                />
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
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Review & Submit</h3>
                
                {/* XP Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-blue-600">Submission Summary</h4>
                    <div className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const qualityBonus = Math.floor(calculateTitleCatchiness(formData.title) / 2);
                        const velocityBonus = formData.trendVelocity && formData.trendSize ? 20 : 0;
                        const predictionBonus = formData.predictedPeak ? 15 : 0;
                        return 30 + qualityBonus + velocityBonus + predictionBonus;
                      })() > 0 ? 'Complete' : 'In Progress'}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">URL & Description</span>
                      <span className="text-gray-800">{formData.url && formData.title ? '✓' : '○'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trend Analysis</span>
                      <span className="text-gray-800">{formData.trendVelocity && formData.trendSize ? '✓' : '○'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Summary cards */}
                <div className="space-y-3">
                  {/* Basic info with thumbnail */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Trend Info</h4>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <p className="text-gray-800 font-medium">{formData.title}</p>
                        <p className="text-sm text-gray-600 break-all">{formData.url}</p>
                        {formData.creator_handle && (
                          <p className="text-sm text-gray-600">by {formData.creator_handle.startsWith('@') ? formData.creator_handle : `@${formData.creator_handle}`}</p>
                        )}
                      </div>
                      {formData.thumbnail_url && (
                        <div className="flex-shrink-0">
                          <img 
                            src={formData.thumbnail_url} 
                            alt="Trend thumbnail"
                            className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Velocity & Timing (HIGH VALUE DATA) */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                    <h4 className="text-sm font-medium text-green-600 mb-2">📊 Market Intelligence</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Velocity</p>
                        <p className="text-sm font-medium text-gray-800 capitalize">
                          {formData.trendVelocity === 'just_starting' && '🌱 Just Starting'}
                          {formData.trendVelocity === 'picking_up' && '📈 Picking Up'}
                          {formData.trendVelocity === 'viral' && '🚀 Going Viral'}
                          {formData.trendVelocity === 'saturated' && '⚡ Saturated'}
                          {formData.trendVelocity === 'declining' && '📉 Declining'}
                          {!formData.trendVelocity && 'Not selected'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Size</p>
                        <p className="text-sm font-medium text-gray-800 capitalize">
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
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="text-xs text-gray-600">Peak Prediction</p>
                        <p className="text-sm font-medium text-blue-600">
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

                  {/* AI Key Insight */}
                  {formData.ai_analysis && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4" />
                        AI Cultural Insight
                      </h4>
                      <div
                        className="text-sm text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatInsightHtml(formData.ai_analysis) }}
                      />
                    </div>
                  )}

                  {/* AI Signal if selected */}
                  {formData.aiAngle && formData.aiAngle !== 'not_ai' && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                      <h4 className="text-sm font-medium text-purple-600 mb-2">🤖 AI Signal</h4>
                      <p className="text-gray-800 font-medium">
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
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Engagement</h4>
                      <div className="flex gap-4">
                        {formData.views_count > 0 && (
                          <div>
                            <p className="text-2xl font-bold text-gray-800">{formatNumber(formData.views_count)}</p>
                            <p className="text-xs text-gray-600">views</p>
                          </div>
                        )}
                        {formData.likes_count > 0 && (
                          <div>
                            <p className="text-2xl font-bold text-gray-800">{formatNumber(formData.likes_count)}</p>
                            <p className="text-xs text-gray-600">likes</p>
                          </div>
                        )}
                        {formData.comments_count > 0 && (
                          <div>
                            <p className="text-2xl font-bold text-gray-800">{formatNumber(formData.comments_count)}</p>
                            <p className="text-xs text-gray-600">comments</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sentiment Analysis */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-3">Trend Sentiment</h4>
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
              className="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg flex items-center gap-2"
            >
              <AlertCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-500">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-0">
            <div className="flex-1 sm:flex-initial">
              {currentStep !== 'url' ? (
                <button
                  onClick={handleBack}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 transition-all text-gray-700 font-medium"
                >
                  Back
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 transition-all text-gray-700 font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
            
            <div className="flex-1 sm:flex-initial">
              {currentStep === 'review' ? (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <SendIcon className="w-4 h-4" />
                      Submit New Trend
                    </>
                  )}
                </button>
              ) : currentStep === 'ai_analysis' ? (
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 transition-all text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Continue to Review
                      <ChevronRightIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all text-white font-medium flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      </div>
    </>
  );
}
