'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import TrendSubmissionForm from '@/components/TrendSubmissionFormEnhanced';
import MobileTrendSubmission from '@/components/MobileTrendSubmission';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
// import { mapCategoryToEnum } from '@/lib/categoryMapper'; // Using inline mapping instead
import { 
  TrendingUp as TrendingUpIcon,
  Plus as PlusIcon,
  ArrowLeft as ArrowLeftIcon,
  Zap as ZapIcon,
  Target as TargetIcon,
  Award as AwardIcon,
  Clock as ClockIcon,
  ExternalLink as ExternalLinkIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Eye as EyeIcon,
  Hash as HashIcon
} from 'lucide-react';

interface TrendData {
  // Basic Info
  url: string;
  trendName: string;
  platform: string;
  screenshot?: File | string;
  explanation: string;
  
  // Audience
  ageRanges: string[];
  subcultures: string[];
  region?: string;
  
  // Categorization
  categories: string[];
  moods: string[];
  
  // Trend Status
  spreadSpeed: string;
  audioOrCatchphrase?: string;
  motivation: string;
  
  // Timing & Spread
  firstSeen: string;
  otherPlatforms: string[];
  brandAdoption: boolean;
  
  // Auto-captured metadata
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  hashtags?: string[];
  thumbnail_url?: string;
}

interface RecentSubmission {
  id: string;
  created_at: string;
  status: string;
  evidence: {
    title?: string;
    platform?: string;
    url?: string;
    [key: string]: any; // Allow for additional fields
  };
  category: string;
  description?: string;
  platform?: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  creator_handle?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  hashtags?: string[];
}

export default function SubmitTrendPage() {
  const router = useRouter();
  const { user, updateUserEarnings } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileForm, setShowMobileForm] = useState(false);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // Detect mobile device and URL parameter
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Check for mobile URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mobile') === 'true') {
      setShowMobileForm(true);
    }
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch recent submissions
  useEffect(() => {
    if (user) {
      fetchRecentSubmissions();
    }
  }, [user]);

  const fetchRecentSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      setRecentSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching recent submissions:', error);
    } finally {
      setLoadingRecent(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatEngagement = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'from-blue-500 to-blue-600';
      case 'validating': return 'from-yellow-500 to-orange-600';
      case 'approved': return 'from-green-500 to-green-600';
      case 'viral': return 'from-purple-500 to-pink-600';
      case 'rejected': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      'visual_style': '🎨',
      'audio_music': '🎵',
      'creator_technique': '🎬',
      'meme_format': '😂',
      'product_brand': '🛍️',
      'behavior_pattern': '📊'
    };
    return emojiMap[category] || '📌';
  };

  const getPlatformIcon = (platform: string) => {
    const iconMap: { [key: string]: string } = {
      'tiktok': '🎵',
      'instagram': '📸',
      'youtube': '▶️',
      'twitter': '🐦',
      'other': '🌐'
    };
    return iconMap[platform] || '🌐';
  };

  const handleTrendSubmit = async (trendData: TrendData) => {
    console.log('Starting trend submission (v2 - no umbrellas) with data:', trendData);
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Ensure user is authenticated
        if (!user?.id) {
          throw new Error('Please log in to submit trends');
        }
        // Upload image if present
        let imageUrl = null;
        if (trendData.screenshot && trendData.screenshot instanceof File) {
          const fileExt = trendData.screenshot.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          // Check if bucket exists, create if not
          const { data: buckets } = await supabase.storage.listBuckets();
          const bucketExists = buckets?.some(bucket => bucket.name === 'trend-images');
          
          if (!bucketExists) {
            // Create bucket if it doesn't exist
            await supabase.storage.createBucket('trend-images', {
              public: true,
              allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
            });
          }
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('trend-images')
            .upload(fileName, trendData.screenshot, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Image upload error:', uploadError);
            // Continue without image if upload fails
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('trend-images')
              .getPublicUrl(fileName);
            
            imageUrl = publicUrl;
          }
        }

      // Skip profile check for now to avoid errors

      // Build the insert data object with proper defaults and validation
      // ALWAYS use inline mapping to avoid import issues
      console.log('Categories from form:', trendData.categories);
      console.log('First category:', trendData.categories?.[0]);
      
      // Direct inline mapping - don't rely on imports
      const categoryMapping: Record<string, string> = {
        'Fashion & Beauty': 'visual_style',
        'Food & Drink': 'behavior_pattern',
        'Humor & Memes': 'meme_format',
        'Lifestyle': 'behavior_pattern',
        'Politics & Social Issues': 'behavior_pattern',
        'Music & Dance': 'audio_music',
        'Sports & Fitness': 'behavior_pattern',
        'Tech & Gaming': 'creator_technique',
        'Art & Creativity': 'visual_style',
        'Education & Science': 'creator_technique',
        // Add any other categories that might exist
        'Entertainment': 'audio_music',
        'Travel': 'behavior_pattern',
        'Business': 'behavior_pattern',
        'Health & Wellness': 'behavior_pattern',
        'Pets & Animals': 'behavior_pattern'
      };
      
      const mappedCategory = categoryMapping[trendData.categories?.[0]] || 'meme_format';
      console.log('Direct mapping result:', trendData.categories?.[0], '→', mappedCategory);
      
      // Double-check the mapping worked
      const validCategories = ['visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern'];
      if (!validCategories.includes(mappedCategory)) {
        console.error('Invalid mapped category:', mappedCategory, 'from original:', trendData.categories?.[0]);
        throw new Error(`Invalid category mapping. "${trendData.categories?.[0]}" could not be mapped to a valid category.`);
      }
      
      // Validate required fields
      if (!mappedCategory) {
        throw new Error('Category is required');
      }
      
      const description = trendData.explanation || trendData.trendName || 'Untitled Trend';
      if (!description || description.trim() === '') {
        throw new Error('Description is required');
      }
      
      const insertData: any = {
        spotter_id: user?.id,
        category: mappedCategory, // Convert category to enum
        description: description,
        screenshot_url: imageUrl || trendData.thumbnail_url || null,
        evidence: {
          url: trendData.url || '',
          title: trendData.trendName || 'Untitled Trend',
          platform: trendData.platform || 'other',
          // Store all the rich data
          ageRanges: trendData.ageRanges,
          subcultures: trendData.subcultures,
          region: trendData.region,
          categories: trendData.categories,
          moods: trendData.moods,
          spreadSpeed: trendData.spreadSpeed,
          audioOrCatchphrase: trendData.audioOrCatchphrase,
          motivation: trendData.motivation,
          firstSeen: trendData.firstSeen,
          otherPlatforms: trendData.otherPlatforms,
          brandAdoption: trendData.brandAdoption
        },
        virality_prediction: trendData.spreadSpeed === 'viral' ? 8 : trendData.spreadSpeed === 'picking_up' ? 6 : 5,
        status: 'pending',
        quality_score: 0.5,
        validation_count: 0,
        created_at: new Date().toISOString()
      };
      
      // Add social media metadata conditionally to avoid null constraint violations
      if (trendData.creator_handle) insertData.creator_handle = trendData.creator_handle;
      if (trendData.creator_name) insertData.creator_name = trendData.creator_name;
      if (trendData.post_caption) insertData.post_caption = trendData.post_caption;
      if (trendData.likes_count !== undefined) insertData.likes_count = trendData.likes_count;
      if (trendData.comments_count !== undefined) insertData.comments_count = trendData.comments_count;
      if (trendData.shares_count !== undefined) insertData.shares_count = trendData.shares_count;
      if (trendData.views_count !== undefined) insertData.views_count = trendData.views_count;
      if (trendData.hashtags && trendData.hashtags.length > 0) insertData.hashtags = trendData.hashtags;
      if (trendData.url) insertData.post_url = trendData.url;
      if (trendData.thumbnail_url) insertData.thumbnail_url = trendData.thumbnail_url;
      if (trendData.posted_at) {
        insertData.posted_at = trendData.posted_at;
      } else {
        insertData.posted_at = new Date().toISOString();
      }

      // Double-check the data right before submission
      console.log('Final check - category:', insertData.category);
      console.log('Final check - status:', insertData.status);
      
      // Create a clean copy to ensure no mutations and double-check category mapping
      const dataToSubmit = {
        spotter_id: insertData.spotter_id,
        category: mappedCategory, // Use the mapped category directly, not from insertData
        description: insertData.description,
        screenshot_url: insertData.screenshot_url,
        evidence: insertData.evidence,
        virality_prediction: insertData.virality_prediction,
        status: 'pending', // Hardcode the status to ensure it's correct
        quality_score: insertData.quality_score,
        validation_count: insertData.validation_count,
        created_at: insertData.created_at,
        // Optional fields
        ...(insertData.creator_handle && { creator_handle: insertData.creator_handle }),
        ...(insertData.creator_name && { creator_name: insertData.creator_name }),
        ...(insertData.post_caption && { post_caption: insertData.post_caption }),
        ...(insertData.likes_count !== undefined && { likes_count: insertData.likes_count }),
        ...(insertData.comments_count !== undefined && { comments_count: insertData.comments_count }),
        ...(insertData.shares_count !== undefined && { shares_count: insertData.shares_count }),
        ...(insertData.views_count !== undefined && { views_count: insertData.views_count }),
        ...(insertData.hashtags && insertData.hashtags.length > 0 && { hashtags: insertData.hashtags }),
        ...(insertData.post_url && { post_url: insertData.post_url }),
        ...(insertData.thumbnail_url && { thumbnail_url: insertData.thumbnail_url }),
        ...(insertData.posted_at && { posted_at: insertData.posted_at })
      };
      
      console.log('Data to submit - category:', dataToSubmit.category);
      console.log('Submitting data to database (stringified):', JSON.stringify(dataToSubmit, null, 2));
      console.log('Submitting data to database (object):', dataToSubmit);

      // Save trend to database with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
      );
      
      // Final safety check
      if (!['visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern'].includes(dataToSubmit.category)) {
        console.error('CRITICAL: Invalid category about to be submitted:', dataToSubmit.category);
        throw new Error(`Category "${dataToSubmit.category}" is not a valid enum. Expected mapped value but got display value.`);
      }
      
      const submissionPromise = supabase
        .from('trend_submissions')
        .insert(dataToSubmit)
        .select()
        .single();
      
      const { data, error } = await Promise.race([
        submissionPromise,
        timeoutPromise
      ]).catch(err => ({ data: null, error: err }));

      if (error) {
        console.error('Database error details:', {
          error: error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          insertData: insertData
        });
        
        // Provide more specific error messages
        if (error.message?.includes('Request timed out')) {
          throw new Error('The submission is taking too long. Please check your internet connection and try again.');
        } else if (error.message?.includes('violates foreign key constraint')) {
          throw new Error('User authentication issue. Please log out and log back in.');
        } else if (error.message?.includes('null value in column')) {
          const columnMatch = error.message.match(/column "(\w+)"/);
          const columnName = columnMatch ? columnMatch[1] : 'unknown';
          throw new Error(`Missing required field: ${columnName}. Please fill in all required fields.`);
        } else if (error.message?.includes('permission denied')) {
          throw new Error('Permission denied. Please ensure you are logged in.');
        } else if (error.message?.includes('invalid input value for enum')) {
          throw new Error(`Invalid category value. Please select a valid category.`);
        }
        
        throw error;
      }

      console.log('Trend submitted successfully:', data);
      setSubmissionSuccess(true);
      
      // Update user earnings in context
      updateUserEarnings(0.10);
      
      // Also update localStorage for persistence
      if (typeof window !== 'undefined' && window.localStorage) {
        const currentEarnings = parseFloat(localStorage.getItem('user_earnings') || '0');
        localStorage.setItem('user_earnings', (currentEarnings + 0.10).toFixed(2));
      }
      
      // Refresh recent submissions
      fetchRecentSubmissions();
      
      // Clear form by resetting states if needed
      // The form component manages its own state, so this is handled internally
      
      setTimeout(() => {
        router.push('/timeline');
      }, 2000);
      
      // Exit retry loop on success
      return;

    } catch (error: any) {
      console.error(`Error submitting trend (attempt ${retryCount + 1}):`, error);
      
      retryCount++;
      
      // If it's the last retry, throw the error
      if (retryCount >= maxRetries) {
        // Provide user-friendly error messages
        let errorMessage = 'Failed to submit trend. ';
        if (error.message?.includes('duplicate key')) {
          errorMessage = 'This trend has already been submitted';
        } else if (error.message?.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again';
        } else if (error.message?.includes('unauthorized') || error.message?.includes('user_id')) {
          errorMessage = 'Please log in again to submit trends';
        } else if (error.message?.includes('category')) {
          errorMessage = 'Please select a valid category';
        } else if (error.message?.includes('Invalid URL')) {
          errorMessage = 'Please provide a valid social media URL';
        } else {
          errorMessage += error.message || 'Please try again';
        }
        
        console.error('Final submission error:', {
          errorMessage,
          originalError: error,
          insertData,
          user: user?.id
        });
        throw new Error(errorMessage);
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
    }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wave-500 mx-auto mb-4"></div>
          <p className="text-wave-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (submissionSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUpIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Trend Submitted!</h2>
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
            <p className="text-green-300 font-semibold text-lg">+$0.10 Earned! 💰</p>
            <p className="text-green-200 text-sm mt-1">Your earnings have been added to your account</p>
          </div>
          <p className="text-wave-300 mb-6">
            Your trend has been submitted successfully and is being processed. 
            Keep spotting trends to increase your earnings!
          </p>
          <p className="text-wave-400 text-sm">Redirecting to timeline...</p>
        </motion.div>
      </div>
    );
  }

  // Show mobile form if requested
  if (showMobileForm) {
    return (
      <MobileTrendSubmission
        onSubmit={handleTrendSubmit}
        onClose={() => {
          setShowMobileForm(false);
          router.push('/submit');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-12"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="p-2.5 sm:p-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 border border-white/10"
            >
              <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent">
                Submit New Trend
              </h1>
              <p className="text-sm sm:text-base text-gray-400 mt-0.5 sm:mt-1">Share trending content and earn rewards</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12"
        >
          <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-6 sm:p-8 backdrop-blur-md border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 group-hover:from-yellow-500/10 group-hover:to-orange-500/10 transition-all duration-500" />
            <div className="relative text-center">
              <ZapIcon className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-1.5 sm:mb-2">Fast Validation</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">Get community feedback within 24 hours</p>
            </div>
          </div>
          
          <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 sm:p-8 backdrop-blur-md border border-green-500/20 hover:border-green-500/40 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 group-hover:from-green-500/10 group-hover:to-emerald-500/10 transition-all duration-500" />
            <div className="relative text-center">
              <TargetIcon className="w-8 h-8 sm:w-10 sm:h-10 text-green-400 mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-1.5 sm:mb-2">Earn Rewards</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">Gain points and unlock exclusive perks</p>
            </div>
          </div>
          
          <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 sm:p-8 backdrop-blur-md border border-purple-500/20 hover:border-purple-500/40 transition-all duration-500 sm:col-span-2 lg:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500" />
            <div className="relative text-center">
              <AwardIcon className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400 mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-1.5 sm:mb-2">Get Recognition</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">Top spotters featured on leaderboards</p>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-gray-900/80 to-gray-900/40 backdrop-blur-xl border border-gray-800/50 p-6 sm:p-8 lg:p-12"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-64 sm:w-96 h-64 sm:h-96 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 sm:w-96 h-64 sm:h-96 bg-purple-500/10 rounded-full blur-3xl" />
          </div>
          
          <div className="relative max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">
              Spot the Next Big Thing
            </h2>
            
            <p className="text-gray-300 text-base sm:text-lg mb-8 sm:mb-10 leading-relaxed max-w-2xl mx-auto px-4">
              Found something trending? Share it with our community of trend spotters. 
              Our AI analyzes submissions in real-time to identify the next viral wave.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10 text-left max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl p-5 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2 text-base sm:text-lg">
                  <span className="text-xl sm:text-2xl">📱</span> Supported Platforms
                </h4>
                <ul className="text-gray-400 space-y-2 text-sm sm:text-base">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1.5">•</span>
                    <span>TikTok videos and sounds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1.5">•</span>
                    <span>Instagram Reels and posts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1.5">•</span>
                    <span>YouTube Shorts and videos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1.5">•</span>
                    <span>Twitter/X viral posts</span>
                  </li>
                </ul>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl p-5 sm:p-6 border border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2 text-base sm:text-lg">
                  <span className="text-xl sm:text-2xl">🏆</span> Earn Rewards
                </h4>
                <ul className="text-gray-400 space-y-2 text-sm sm:text-base">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1.5">•</span>
                    <span>Early trend detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1.5">•</span>
                    <span>High-quality submissions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1.5">•</span>
                    <span>Community validation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1.5">•</span>
                    <span>Accurate categorization</span>
                  </li>
                </ul>
              </motion.div>
            </div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={() => isMobile ? router.replace('/submit?mobile=true') : setShowForm(true)}
              className="group relative inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-10 py-3.5 sm:py-5 text-base sm:text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl hover:shadow-2xl sm:hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <PlusIcon className="relative w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300" />
              <span className="relative">Submit New Trend</span>
            </motion.button>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-gray-500 text-xs sm:text-sm mt-4 sm:mt-6 px-4"
            >
              By submitting content, you agree to our community guidelines and terms of service
            </motion.p>
          </div>
        </motion.div>

        {/* Recent Submissions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 sm:mt-16"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-white">Your Recent Submissions</h3>
            <button 
              onClick={() => router.push('/timeline')}
              className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>View all</span>
              <span>→</span>
            </button>
          </div>
          
          <div className="rounded-2xl bg-gradient-to-b from-gray-900/60 to-gray-900/30 backdrop-blur-md border border-gray-800/50">
            {loadingRecent ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-wave-500 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading recent submissions...</p>
              </div>
            ) : recentSubmissions.length === 0 ? (
              <div className="text-center py-16 px-8">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.7, 0.5]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <TrendingUpIcon className="w-16 h-16 mx-auto mb-6 text-gray-600" />
                </motion.div>
                <p className="text-gray-400 text-lg font-medium">No submissions yet</p>
                <p className="text-gray-500 mt-2">Be the first to spot the next viral trend!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {recentSubmissions.map((submission, index) => (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 sm:p-6 hover:bg-white/5 transition-all duration-300 group"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Thumbnail */}
                      {(submission.thumbnail_url || submission.screenshot_url) ? (
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl overflow-hidden flex-shrink-0 bg-gray-800">
                          <img 
                            src={submission.thumbnail_url || submission.screenshot_url} 
                            alt="Trend thumbnail"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl sm:text-2xl">{getCategoryEmoji(submission.category)}</span>
                        </div>
                      )}
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white truncate text-sm sm:text-base">
                              {submission.evidence?.title || submission.description || 'Untitled Trend'}
                            </h4>
                            
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-gray-400">
                              {/* Platform */}
                              {(submission.evidence?.platform || submission.platform) && (
                                <span className="flex items-center gap-1">
                                  <span>{getPlatformIcon(submission.evidence?.platform || submission.platform)}</span>
                                  <span className="capitalize">{submission.evidence?.platform || submission.platform}</span>
                                </span>
                              )}
                              
                              {/* Creator */}
                              {submission.creator_handle && (
                                <span className="truncate max-w-[150px]">
                                  {submission.creator_handle}
                                </span>
                              )}
                              
                              {/* Time */}
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                {formatDate(submission.created_at)}
                              </span>
                            </div>
                            
                            {/* Caption preview */}
                            {submission.post_caption && (
                              <p className="text-xs sm:text-sm text-gray-500 mt-1.5 sm:mt-2 line-clamp-1">
                                "{submission.post_caption}"
                              </p>
                            )}
                            
                            {/* Engagement stats */}
                            {(submission.likes_count > 0 || submission.comments_count > 0 || submission.views_count > 0) && (
                              <div className="flex items-center gap-4 mt-2">
                                {submission.likes_count > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <HeartIcon className="w-3 h-3" />
                                    {formatEngagement(submission.likes_count)}
                                  </span>
                                )}
                                {submission.comments_count > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <MessageCircleIcon className="w-3 h-3" />
                                    {formatEngagement(submission.comments_count)}
                                  </span>
                                )}
                                {submission.views_count > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <EyeIcon className="w-3 h-3" />
                                    {formatEngagement(submission.views_count)}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Hashtags */}
                            {submission.hashtags && submission.hashtags.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <HashIcon className="w-3 h-3 text-gray-500" />
                                <div className="flex gap-1 flex-wrap">
                                  {submission.hashtags.slice(0, 3).map((tag, i) => (
                                    <span key={i} className="text-xs text-gray-500">
                                      #{tag}
                                    </span>
                                  ))}
                                  {submission.hashtags.length > 3 && (
                                    <span className="text-xs text-gray-600">
                                      +{submission.hashtags.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Status and link */}
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${getStatusColor(submission.status)} text-white text-xs font-medium`}>
                              {submission.status}
                            </div>
                            {submission.evidence?.url && (
                              <a 
                                href={submission.evidence.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLinkIcon className="w-4 h-4 text-gray-400" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Trend Submission Form Modal */}
      {showForm && (
        <TrendSubmissionForm
          onClose={() => setShowForm(false)}
          onSubmit={handleTrendSubmit}
        />
      )}
    </div>
  );
}