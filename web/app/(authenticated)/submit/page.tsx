'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  ArrowLeft, 
  Link, 
  Send,
  Loader2,
  CheckCircle,
  Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import TrendSubmissionFormEnhanced from '@/components/TrendSubmissionFormEnhanced';

// Fixed category mapping
const CATEGORY_MAP: Record<string, string> = {
  'Fashion & Beauty': 'visual_style',
  'Food & Drink': 'behavior_pattern',
  'Humor & Memes': 'meme_format',
  'Lifestyle': 'behavior_pattern',
  'Politics & Social Issues': 'behavior_pattern',
  'Music & Dance': 'audio_music',
  'Sports & Fitness': 'behavior_pattern',
  'Tech & Gaming': 'creator_technique',
  'Art & Creativity': 'visual_style',
  'Education & Science': 'creator_technique'
};

interface SubmissionStats {
  todayCount: number;
  pendingVerification: number;
  approved: number;
  rejected: number;
}

export default function WorkingSubmitPage() {
  const router = useRouter();
  const { user, updateUserEarnings } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trendUrl, setTrendUrl] = useState('');
  const [stats, setStats] = useState<SubmissionStats>({
    todayCount: 0,
    pendingVerification: 0,
    approved: 0,
    rejected: 0
  });
  const [recentSubmission, setRecentSubmission] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user?.id) return;

    try {
      // Get today's submissions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: submissions } = await supabase
        .from('trend_submissions')
        .select('status')
        .eq('spotter_id', user.id)
        .gte('created_at', today.toISOString());

      if (submissions) {
        setStats({
          todayCount: submissions.length,
          pendingVerification: submissions.filter(s => s.status === 'submitted' || s.status === 'validating').length,
          approved: submissions.filter(s => s.status === 'approved').length,
          rejected: submissions.filter(s => s.status === 'rejected').length
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleTrendSubmit = async (trendData: any) => {
    if (!user?.id) {
      alert('Please log in to submit trends');
      return;
    }

    setSubmitting(true);
    console.log('📤 [SUBMIT PAGE] Submitting trend data:', trendData);
    console.log('🖼️ [SUBMIT PAGE] Thumbnail URL received:', trendData.thumbnail_url);
    console.log('📊 [SUBMIT PAGE] Wave Score:', trendData.wave_score);
    
    // CRITICAL DEBUG: Check thumbnail before submission
    if (!trendData.thumbnail_url || trendData.thumbnail_url === '') {
      console.error('⚠️ [SUBMIT PAGE] WARNING: No thumbnail URL in trendData!');
    }

    try {
      // Handle screenshot upload first if present
      let screenshotUrl = null;
      if (trendData.screenshot && trendData.screenshot instanceof File) {
        const timestamp = Date.now();
        const fileName = `${user.id}/${timestamp}-${trendData.screenshot.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('trend-images')
          .upload(fileName, trendData.screenshot);
          
        if (uploadError) {
          console.error('Screenshot upload error:', uploadError);
        } else {
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('trend-images')
            .getPublicUrl(fileName);
          screenshotUrl = publicUrl;
        }
      }

      // Map category to enum value
      const displayCategory = trendData.categories?.[0] || 'Humor & Memes';
      const mappedCategory = CATEGORY_MAP[displayCategory] || 'meme_format';

      // Build submission object
      const submission: any = {
        spotter_id: user.id,
        category: mappedCategory,
        description: trendData.explanation || trendData.trendName || 'Untitled Trend',
        evidence: {
          url: trendData.url ? trendData.url.trim() : '',
          title: trendData.trendName || 'Untitled',
          platform: trendData.platform || 'other',
          categories: trendData.categories || [],
          moods: trendData.moods || [],
          ageRanges: trendData.ageRanges || [],
          subcultures: trendData.subcultures || [],
          region: trendData.region || '',
          spreadSpeed: trendData.spreadSpeed || 'emerging',
          motivation: trendData.motivation || '',
          firstSeen: trendData.firstSeen || new Date().toISOString(),
          audioOrCatchphrase: trendData.audioOrCatchphrase || '',
          brandAdoption: trendData.brandAdoption || false
        },
        status: 'submitted', // Initial status - goes to verification queue
        virality_prediction: trendData.spreadSpeed === 'viral' ? 8 : 
                            trendData.spreadSpeed === 'picking_up' ? 6 : 5,
        quality_score: 0.5,
        validation_count: 0,
        screenshot_url: screenshotUrl || trendData.screenshot_url || null,
        post_url: trendData.url ? trendData.url.trim() : null,
        thumbnail_url: trendData.thumbnail_url || null // Ensure thumbnail_url is included
        // Remove created_at - it's handled by database default
      };

      // Add social media metadata if available
      // Ensure numeric values are within safe ranges for database
      const MAX_SAFE_COUNT = 2147483647; // Max value for INTEGER type (will be upgraded to BIGINT)
      
      if (trendData.creator_handle) submission.creator_handle = trendData.creator_handle;
      if (trendData.creator_name) submission.creator_name = trendData.creator_name;
      if (trendData.post_caption) submission.post_caption = trendData.post_caption;
      
      // Safely handle numeric fields - cap at max safe value
      if (trendData.likes_count !== undefined) {
        submission.likes_count = Math.min(trendData.likes_count, MAX_SAFE_COUNT);
      }
      if (trendData.comments_count !== undefined) {
        submission.comments_count = Math.min(trendData.comments_count, MAX_SAFE_COUNT);
      }
      if (trendData.views_count !== undefined) {
        submission.views_count = Math.min(trendData.views_count, MAX_SAFE_COUNT);
      }
      
      if (trendData.hashtags?.length) submission.hashtags = trendData.hashtags;
      
      // Override thumbnail_url to ensure it's properly set
      const thumbnailToSave = (trendData.thumbnail_url && trendData.thumbnail_url.trim()) ? trendData.thumbnail_url.trim() : null;
      submission.thumbnail_url = thumbnailToSave;
      
      console.log('🎯 [SUBMIT PAGE] Final thumbnail_url to save:', submission.thumbnail_url);
      console.log('📦 [SUBMIT PAGE] Full submission object keys:', Object.keys(submission));
      
      // Double-check the thumbnail is in the submission
      if (!submission.thumbnail_url) {
        console.error('❌ [SUBMIT PAGE] CRITICAL: No thumbnail in final submission object!');
      }
      
      if (trendData.posted_at) submission.posted_at = trendData.posted_at;
      
      // Add wave_score if available - keep as 0-100 scale
      if (trendData.wave_score !== undefined) {
        submission.wave_score = trendData.wave_score; // Keep as 0-100
      }

      console.log('Final submission object:', submission);
      console.log('Thumbnail URL in submission:', submission.thumbnail_url);
      console.log('Wave Score in submission:', submission.wave_score);
      console.log('Post URL in submission:', submission.post_url);

      // Submit to database
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert(submission)
        .select()
        .single();

      if (error) {
        console.error('Submission error:', error);
        throw new Error(error.message);
      }

      console.log('Submission successful:', data);

      // Calculate earnings using EARNINGS_STANDARD
      const { calculateTrendSubmissionEarnings, formatEarnings } = await import('@/lib/EARNINGS_STANDARD');
      
      // Build earnings data matching TrendSubmissionData interface
      const earningsData = {
        trendName: trendData.trendName || submission.evidence?.title || 'Untitled',
        description: trendData.explanation || submission.description,
        screenshot_url: screenshotUrl || trendData.screenshot_url,
        ageRanges: trendData.ageRanges || [],
        subcultures: trendData.subcultures || [],
        otherPlatforms: trendData.otherPlatforms || [],
        creator_handle: trendData.creator_handle,
        hashtags: trendData.hashtags || [],
        post_caption: trendData.post_caption,
        views_count: trendData.views_count,
        likes_count: trendData.likes_count,
        comments_count: trendData.comments_count,
        wave_score: trendData.wave_score,
        category: displayCategory,
        platform: trendData.platform,
        isFinanceTrend: displayCategory === 'Finance' || trendData.tickers?.length > 0
      };
      
      // Get current streak from user profile
      const currentStreak = user?.current_streak || 0;
      const spotterTier = user?.spotter_tier || 'learning';
      
      const earningResult = calculateTrendSubmissionEarnings(
        earningsData,
        spotterTier as any,
        currentStreak
      );
      
      console.log('Earning calculation:', {
        base: earningResult.baseAmount,
        bonus: earningResult.bonusAmount,
        final: earningResult.finalAmount,
        bonuses: earningResult.appliedBonuses
      });
      
      // Update user earnings with the calculated amount
      updateUserEarnings(earningResult.finalAmount);
      
      // Store submission with earnings info for display
      setRecentSubmission({
        ...data,
        calculatedEarnings: earningResult.finalAmount,
        formattedEarnings: formatEarnings(earningResult.finalAmount)
      });

      // Show success state
      setShowForm(false);
      setTrendUrl('');
      
      // Refresh stats
      await fetchStats();

      // Navigate to timeline after short delay
      setTimeout(() => {
        router.push('/timeline');
      }, 2000);

    } catch (error: any) {
      console.error('Error submitting trend:', error);
      alert(`Error: ${error.message || 'Failed to submit trend'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSubmit = () => {
    if (!trendUrl.trim()) return;
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-black">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <button
            onClick={() => router.push('/dashboard')}
            className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          
          <h1 className="text-2xl font-bold text-white">Submit New Trend</h1>
          
          <div className="text-right">
            <p className="text-xs text-gray-400">Today's Submissions</p>
            <p className="text-xl font-bold text-white">{stats.todayCount}</p>
          </div>
        </motion.div>

        {/* Success Message */}
        {recentSubmission && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-500/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/30"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white font-semibold">Trend submitted successfully!</p>
                <p className="text-green-200 text-sm">
                  Your submission is now in the verification queue. You earned {recentSubmission.formattedEarnings || '$0.25'}!
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Submit Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-indigo-600/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Spot a Trend?</h3>
              <p className="text-blue-200/80">Submit it and earn when it's verified</p>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleQuickSubmit(); }} className="space-y-4">
            <div className="relative">
              <input
                type="url"
                value={trendUrl}
                onChange={(e) => setTrendUrl(e.target.value)}
                placeholder="Paste trending link here..."
                className="w-full px-5 py-4 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                disabled={submitting}
              />
              <Link className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            
            <button
              type="submit"
              disabled={!trendUrl.trim() || submitting}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 rounded-xl font-bold text-lg transition-all text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Add Trend Details
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 grid grid-cols-3 gap-4"
        >
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-yellow-400 text-2xl font-bold">{stats.pendingVerification}</p>
            <p className="text-gray-400 text-sm">Pending</p>
          </div>
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-green-400 text-2xl font-bold">{stats.approved}</p>
            <p className="text-gray-400 text-sm">Approved</p>
          </div>
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-red-400 text-2xl font-bold">{stats.rejected}</p>
            <p className="text-gray-400 text-sm">Rejected</p>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20"
        >
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">How It Works</h3>
          </div>
          <ol className="space-y-2 text-sm text-gray-300">
            <li>1. Submit trends you spot on social media</li>
            <li>2. Other users verify your submissions</li>
            <li>3. Approved trends earn you $0.25 + bonuses (up to $2.25 for masters)</li>
            <li>4. Verified trends feed into enterprise dashboard</li>
            <li>5. Track your performance in Timeline</li>
          </ol>
        </motion.div>
      </div>

      {/* Trend Submission Form Modal */}
      {showForm && (
        <TrendSubmissionFormEnhanced
          onClose={() => {
            setShowForm(false);
            setTrendUrl('');
          }}
          onSubmit={handleTrendSubmit}
          initialUrl={trendUrl}
        />
      )}
    </div>
  );
}