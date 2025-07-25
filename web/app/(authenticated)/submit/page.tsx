'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import TrendSubmissionForm from '@/components/TrendSubmissionForm';
import MobileTrendSubmission from '@/components/MobileTrendSubmission';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { TrendUmbrellaService } from '@/lib/trendUmbrellaService';
import { 
  TrendingUp as TrendingUpIcon,
  Plus as PlusIcon,
  ArrowLeft as ArrowLeftIcon,
  Zap as ZapIcon,
  Target as TargetIcon,
  Award as AwardIcon
} from 'lucide-react';

interface TrendData {
  url: string;
  title: string;
  description: string;
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

export default function SubmitTrendPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileForm, setShowMobileForm] = useState(false);

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

  const handleTrendSubmit = async (trendData: TrendData) => {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Upload image if present
        let imageUrl = null;
        if (trendData.image && trendData.image instanceof File) {
          const fileExt = trendData.image.name.split('.').pop();
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
            .upload(fileName, trendData.image, {
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

      // Find or create trend umbrella with error handling
      let umbrellaId = null;
      try {
        umbrellaId = await TrendUmbrellaService.findOrCreateUmbrella(
          trendData.title,
          trendData.hashtags,
          trendData.description
        );
      } catch (umbrellaError) {
        console.error('Error creating trend umbrella:', umbrellaError);
        // Continue without umbrella if service fails
      }

      // Save trend to database
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert({
          spotter_id: user?.id,
          category: trendData.category,
          description: `${trendData.title}\n\n${trendData.description}\n\nURL: ${trendData.url}\nPlatform: ${trendData.platform}`,
          screenshot_url: imageUrl,
          evidence: {
            url: trendData.url,
            title: trendData.title,
            platform: trendData.platform,
            submitted_by: user?.username || user?.email
          },
          virality_prediction: 5, // Default middle score
          status: 'submitted',
          // Social media metadata
          creator_handle: trendData.creator_handle || null,
          creator_name: trendData.creator_name || null,
          post_caption: trendData.post_caption || null,
          likes_count: trendData.likes_count || 0,
          comments_count: trendData.comments_count || 0,
          shares_count: trendData.shares_count || 0,
          views_count: trendData.views_count || 0,
          hashtags: trendData.hashtags || [],
          post_url: trendData.url,
          thumbnail_url: imageUrl || null,
          posted_at: new Date().toISOString(),
          // Link to trend umbrella
          trend_umbrella_id: umbrellaId
        })
        .select()
        .single();

      if (error) throw error;

      setSubmissionSuccess(true);
      
      // Clear form data from memory
      setFormData({
        url: '',
        title: '',
        description: '',
        category: '',
        platform: '',
        creator_handle: '',
        creator_name: '',
        post_caption: '',
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        views_count: 0,
        hashtags: []
      });
      
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
        if (error.message?.includes('duplicate key')) {
          throw new Error('This trend has already been submitted');
        } else if (error.message?.includes('network')) {
          throw new Error('Network error. Please check your connection and try again');
        } else if (error.message?.includes('unauthorized')) {
          throw new Error('Please log in again to submit trends');
        } else {
          throw new Error(error.message || 'Failed to submit trend. Please try again');
        }
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
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
          <p className="text-wave-300 mb-6">
            Your trend has been submitted successfully and is now under review. 
            You'll earn points once it's validated by the community.
          </p>
          <p className="text-wave-400 text-sm">Redirecting to dashboard...</p>
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
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-12"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 border border-white/10"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent">
                Submit New Trend
              </h1>
              <p className="text-gray-400 mt-1">Share trending content and earn rewards</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-8 backdrop-blur-md border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 group-hover:from-yellow-500/10 group-hover:to-orange-500/10 transition-all duration-500" />
            <ZapIcon className="w-10 h-10 text-yellow-400 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xl font-semibold text-white mb-2">Fast Validation</h3>
            <p className="text-gray-400 text-sm">Get community feedback within 24 hours</p>
          </div>
          
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-8 backdrop-blur-md border border-green-500/20 hover:border-green-500/40 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 group-hover:from-green-500/10 group-hover:to-emerald-500/10 transition-all duration-500" />
            <TargetIcon className="w-10 h-10 text-green-400 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xl font-semibold text-white mb-2">Earn Rewards</h3>
            <p className="text-gray-400 text-sm">Gain points and unlock exclusive perks</p>
          </div>
          
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-8 backdrop-blur-md border border-purple-500/20 hover:border-purple-500/40 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500" />
            <AwardIcon className="w-10 h-10 text-purple-400 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xl font-semibold text-white mb-2">Get Recognition</h3>
            <p className="text-gray-400 text-sm">Top spotters featured on leaderboards</p>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-gray-900/80 to-gray-900/40 backdrop-blur-xl border border-gray-800/50 p-12"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          </div>
          
          <div className="relative max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Spot the Next Big Thing
            </h2>
            
            <p className="text-gray-300 text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
              Found something trending? Share it with our community of trend spotters. 
              Our AI analyzes submissions in real-time to identify the next viral wave.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 text-left max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-2xl">📱</span> Supported Platforms
                </h4>
                <ul className="text-gray-400 space-y-2">
                  <li className="flex items-center gap-2"><span className="text-blue-400">•</span> TikTok videos and sounds</li>
                  <li className="flex items-center gap-2"><span className="text-blue-400">•</span> Instagram Reels and posts</li>
                  <li className="flex items-center gap-2"><span className="text-blue-400">•</span> YouTube Shorts and videos</li>
                  <li className="flex items-center gap-2"><span className="text-blue-400">•</span> Twitter/X viral posts</li>
                </ul>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-2xl">🏆</span> Earn Rewards
                </h4>
                <ul className="text-gray-400 space-y-2">
                  <li className="flex items-center gap-2"><span className="text-green-400">•</span> Early trend detection</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">•</span> High-quality submissions</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">•</span> Community validation</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">•</span> Accurate categorization</li>
                </ul>
              </motion.div>
            </div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={() => isMobile ? router.replace('/submit?mobile=true') : setShowForm(true)}
              className="group relative inline-flex items-center gap-3 px-10 py-5 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <PlusIcon className="relative w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
              <span className="relative">Submit New Trend</span>
            </motion.button>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-gray-500 text-sm mt-6"
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
          className="mt-12"
        >
          <h3 className="text-2xl font-semibold text-white mb-6">Your Recent Submissions</h3>
          <div className="rounded-2xl bg-gradient-to-b from-gray-900/60 to-gray-900/30 backdrop-blur-md border border-gray-800/50 p-8">
            <div className="text-center py-12">
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
              <p className="text-gray-400 text-lg">No submissions yet</p>
              <p className="text-gray-500 mt-2">Be the first to spot the next viral trend!</p>
            </div>
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