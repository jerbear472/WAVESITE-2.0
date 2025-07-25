'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import TrendSubmissionForm from '@/components/TrendSubmissionForm';
import MobileTrendSubmission from '@/components/MobileTrendSubmission';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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
    try {
      // Upload image if present
      let imageUrl = null;
      if (trendData.image && trendData.image instanceof File) {
        const fileExt = trendData.image.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('trend-images')
          .upload(fileName, trendData.image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('trend-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
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
          status: 'submitted'
        })
        .select()
        .single();

      if (error) throw error;

      setSubmissionSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error submitting trend:', error);
      throw error;
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
    <div className="min-h-screen text-white">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-wave-800/50 hover:bg-wave-700/50 transition-all"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-wave-200 bg-clip-text text-transparent">
                Submit New Trend
              </h1>
              <p className="text-wave-400">Share trending content and earn points</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="wave-card p-6 text-center">
            <ZapIcon className="w-8 h-8 text-wave-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Fast Validation</h3>
            <p className="text-wave-400 text-sm">Get community feedback within 24 hours</p>
          </div>
          
          <div className="wave-card p-6 text-center">
            <TargetIcon className="w-8 h-8 text-wave-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Earn Points</h3>
            <p className="text-wave-400 text-sm">Gain accuracy score for validated trends</p>
          </div>
          
          <div className="wave-card p-6 text-center">
            <AwardIcon className="w-8 h-8 text-wave-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Recognition</h3>
            <p className="text-wave-400 text-sm">Top spotters get featured on leaderboards</p>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="wave-card p-8 text-center"
        >
          <div className="max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-wave-500 to-wave-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <PlusIcon className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">
              Ready to Submit a Trend?
            </h2>
            
            <p className="text-wave-300 mb-8">
              Found something trending on social media? Share it with the community and help others 
              spot the next viral wave. Our AI will analyze your submission and assign a Wave Score.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
              <div className="bg-wave-800/30 rounded-xl p-4">
                <h4 className="font-semibold text-wave-200 mb-2">📱 Supported Platforms</h4>
                <ul className="text-wave-400 text-sm space-y-1">
                  <li>• TikTok videos and sounds</li>
                  <li>• Instagram Reels and posts</li>
                  <li>• YouTube Shorts and videos</li>
                  <li>• Twitter/X viral posts</li>
                </ul>
              </div>
              
              <div className="bg-wave-800/30 rounded-xl p-4">
                <h4 className="font-semibold text-wave-200 mb-2">🏆 Earn Points For</h4>
                <ul className="text-wave-400 text-sm space-y-1">
                  <li>• Early trend detection</li>
                  <li>• High-quality submissions</li>
                  <li>• Community validation</li>
                  <li>• Accurate categorization</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => isMobile ? router.replace('/submit?mobile=true') : setShowForm(true)}
              className="wave-button text-lg px-8 py-4 inline-flex items-center gap-3"
            >
              <PlusIcon className="w-5 h-5" />
              Submit New Trend
            </button>

            <p className="text-wave-500 text-xs mt-4">
              By submitting content, you agree to our community guidelines and terms of service
            </p>
          </div>
        </motion.div>

        {/* Recent Submissions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Your Recent Submissions</h3>
          <div className="wave-card p-6">
            <div className="text-center text-wave-400 py-8">
              <TrendingUpIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No submissions yet. Be the first to spot a trend!</p>
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