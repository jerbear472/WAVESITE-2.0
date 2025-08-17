'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  DollarSign, 
  ArrowLeft,
  Link,
  Send,
  Loader2,
  Flame,
  Clock,
  CheckCircle,
  X,
  Globe,
  Sparkles,
  AlertCircle,
  Coins,
  Zap,
  Timer,
  TrendingDown,
  Award,
  Play,
  Pause
} from 'lucide-react';
import { ScrollSession } from '@/components/ScrollSession';
import { SpotterTierDisplay } from '@/components/SpotterTierDisplay';
import SmartTrendSubmission from '@/components/SmartTrendSubmission';
import StreakDisplay from '@/components/StreakDisplay';
// import TrendSubmissionFormSimple from '@/components/TrendSubmissionFormSimple';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
import WaveLogo from '@/components/WaveLogo';
// formatCurrency now comes from SUSTAINABLE_EARNINGS
import { supabase } from '@/lib/supabase';
import { getSafeCategory, getSafeStatus } from '@/lib/safeCategory';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EarningsAnimation, useEarningsAnimation } from '@/components/EarningsAnimation';
import { 
  SUSTAINABLE_EARNINGS,
  formatCurrency,
  calculateUserTier,
  calculateTrendEarnings,
  type Tier
} from '@/lib/SUSTAINABLE_EARNINGS';
import { calculateQualityScore } from '@/lib/calculateQualityScore';

// Primary platforms with better colors
const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: 'bg-black', url: 'https://www.tiktok.com/foryou' },
  { id: 'instagram', label: 'Instagram', icon: '📸', color: 'bg-gradient-to-br from-purple-600 to-pink-600', url: 'https://www.instagram.com' },
  { id: 'twitter', label: 'X', icon: '𝕏', color: 'bg-black', url: 'https://twitter.com/home' },
  { id: 'reddit', label: 'Reddit', icon: '🔥', color: 'bg-orange-600', url: 'https://www.reddit.com/r/popular' },
  { id: 'youtube', label: 'YouTube', icon: '📺', color: 'bg-red-600', url: 'https://www.youtube.com/feed/trending' }
];


export default function LegibleScrollPage() {
  const router = useRouter();
  const { user, refreshUser, updateUserEarnings } = useAuth();
  
  // Default tier info for display
  const tierInfo = user ? calculateUserTier({
    trends_submitted: user.trends_spotted || 0,
    approval_rate: user.accuracy_score || 0,  // Use accuracy_score instead
    quality_score: user.validation_score || 50  // Use validation_score instead
  }) : SUSTAINABLE_EARNINGS.tiers.learning;
  const { session, startSession, endSession, logTrendSubmission } = useSession();
  const scrollSessionRef = useRef<any>();
  const { showEarnings, earningsData, showEarningsAnimation, hideEarningsAnimation } = useEarningsAnimation();
  
  // Core states
  const [trendUrl, setTrendUrl] = useState('');
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Stats
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [todaysPendingEarnings, setTodaysPendingEarnings] = useState(0);
  const [trendsLoggedToday, setTrendsLoggedToday] = useState(0);
  const [recentTickers, setRecentTickers] = useState<string[]>([]);

  // Load stats on mount
  useEffect(() => {
    if (user) {
      loadTodaysStats();
      loadRecentTickers();
    }
  }, [user]);

  // Subscribe to real-time earnings updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('scroll-earnings-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'earnings_ledger',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Earnings update on scroll page:', payload);
          // Reload stats when earnings change
          loadTodaysStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const loadTodaysStats = async () => {
    if (!user) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      // Get pending earnings directly from earnings_ledger for accuracy
      const { data: pendingTransactions } = await supabase
        .from('earnings_ledger')
        .select('amount, created_at')
        .eq('user_id', user.id)
        .in('status', ['pending', 'awaiting_verification']);
      
      // Calculate today's pending earnings
      const todaysPending = pendingTransactions
        ?.filter(t => new Date(t.created_at) >= today)
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      
      // Calculate all pending earnings
      const allPending = pendingTransactions
        ?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      
      // Show all pending earnings (more motivating for users)
      setTodaysPendingEarnings(allPending);
      
      // Get today's approved earnings from earnings_ledger
      const { data: approvedToday } = await supabase
        .from('earnings_ledger')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .gte('created_at', today.toISOString());
      
      const todaysApproved = approvedToday
        ?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      
      setTodaysEarnings(todaysApproved);
      
      const { count } = await supabase
        .from('trend_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('spotter_id', user.id)
        .gte('created_at', today.toISOString());
      
      setTrendsLoggedToday(count || 0);
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentTickers = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('trend_submissions')
        .select('finance_data')
        .eq('spotter_id', user.id)
        .not('finance_data', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);
      
      const tickers = new Set<string>();
      data?.forEach(item => {
        item.finance_data?.tickers?.forEach((ticker: string) => tickers.add(ticker));
      });
      
      setRecentTickers(Array.from(tickers).slice(0, 5));
    } catch (error) {
      console.error('Error loading tickers:', error);
    }
  };

  // Helper function to format time
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Streak multipliers - NOT part of base earnings, just for display/gamification
  const getStreakMultiplier = (streakCount: number): number => {
    // Session streak multipliers - must match SUSTAINABLE_EARNINGS.sessionStreakMultipliers
    if (streakCount >= 5) return 2.5;  // 5+ submissions within 5 min
    if (streakCount === 4) return 2.0; // 4th submission within 5 min
    if (streakCount === 3) return 1.5; // 3rd submission within 5 min
    if (streakCount === 2) return 1.2; // 2nd submission within 5 min
    return 1.0; // First submission
  };

  const calculateMultiplier = (streakCount: number): number => {
    return getStreakMultiplier(streakCount);
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (isValidUrl(pastedText)) {
      setTrendUrl(pastedText);
      // Immediately open the form - no session required
      setTimeout(() => {
        setShowSubmissionForm(true);
      }, 100);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (trendUrl && isValidUrl(trendUrl)) {
      setShowSubmissionForm(true);
    } else {
      setSubmitMessage({ type: 'error', text: 'Please enter a valid URL' });
      setTimeout(() => setSubmitMessage(null), 3000);
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handlePlatformClick = (platform: typeof PLATFORMS[0]) => {
    window.open(platform.url, platform.id, 'width=1200,height=800,left=200,top=100');
  };

  const handleTrendSubmit = async (formData: any) => {
    if (!user) {
      setSubmitMessage({ type: 'error', text: 'Please log in to submit trends' });
      return;
    }
    
    setIsSubmitting(true);
    setRetryStatus(''); // Clear any previous retry status
    
    try {
      // Handle screenshot upload
      let screenshotUrl = formData.thumbnail_url;
      if (formData.screenshot && formData.screenshot instanceof File) {
        try {
          const fileExt = formData.screenshot.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('trend-images')
            .upload(fileName, formData.screenshot);

          if (uploadError) {
            console.error('Screenshot upload error:', uploadError);
          } else if (uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('trend-images')
              .getPublicUrl(fileName);
            screenshotUrl = publicUrl;
          }
        } catch (uploadErr) {
          console.error('Error handling screenshot:', uploadErr);
          // Continue without screenshot
        }
      }
      
      // Extract finance tickers
      const allText = [
        formData.trendName,
        formData.explanation,
        formData.post_caption,
        ...(formData.hashtags || [])
      ].join(' ');
      
      const tickers = extractTickers(allText);
      const isFinanceTrend = tickers.length > 0 || 
        formData.categories?.some((c: string) => 
          c.toLowerCase().includes('stock') || 
          c.toLowerCase().includes('coin') || 
          c.toLowerCase().includes('crypto')
        );
      
      // Get user's current streak information for earnings calculation
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('current_streak, session_streak, last_submission_at, performance_tier')
        .eq('id', user.id)  // Primary key is 'id' in user_profiles table
        .single();
      
      // Build user profile for earnings calculation with streak data
      const userProfileForEarnings = {
        user_id: user?.id || '',
        performance_tier: profileData?.performance_tier || user?.performance_tier || 'learning',
        current_balance: user?.total_earnings || 0,
        total_earned: user?.total_earnings || 0,
        trends_submitted: (user as any)?.trends_spotted || 0,
        approval_rate: user?.accuracy_score || 0.5,
        quality_score: user?.validation_score || 0.5,
        current_streak: profileData?.current_streak || 0,
        session_streak: profileData?.session_streak || 0,
        last_submission_at: profileData?.last_submission_at
      };
      
      // Calculate earnings with SUSTAINABLE_EARNINGS (expects trend, userProfile)
      const earningsResult = calculateTrendEarnings(
        null, // trend data not used in calculation
        userProfileForEarnings
      );
      
      console.log('💰 [SCROLL] Earnings calculation result:', {
        base: earningsResult.base,
        tierMultiplier: earningsResult.tierMultiplier,
        total: earningsResult.total,
        capped: earningsResult.capped,
        breakdown: earningsResult.breakdown,
        userTier: userProfileForEarnings.performance_tier,
        currentStreak: userProfileForEarnings.current_streak,
        sessionStreak: userProfileForEarnings.session_streak
      });
      
      const basePayment = earningsResult.base || 0.25;
      let finalPayment = earningsResult.capped || earningsResult.total || basePayment;
      
      // Ensure we have a valid payment amount
      if (!finalPayment || finalPayment <= 0 || isNaN(finalPayment)) {
        console.error('Invalid payment amount calculated:', finalPayment);
        // Default to base payment if calculation fails
        finalPayment = 0.25; // Base amount
        console.log('Using fallback payment:', finalPayment);
      }
      
      console.log('Final payment amount to be used:', finalPayment);
      
      // Prepare submission - use basic fields that exist in database
      const submissionData: any = {
        spotter_id: user.id,
        category: getSafeCategory(formData.categories?.[0] || 'other'),
        description: formData.trendName || formData.explanation || 'Untitled Trend',
        status: getSafeStatus('submitted'),
        evidence: {
          ...formData,
          session_duration: session.duration,
          streak_count: session.isActive ? session.currentStreak + 1 : 0,
          streak_multiplier: session.isActive ? session.streakMultiplier : 1,
          // Profile data can be added later when available
          user_profile: {},
          payment_amount: finalPayment, // Store payment in evidence instead
          // Store velocity data in evidence instead of follow_up_data
          velocityMetrics: formData.velocityMetrics || {
            velocity: formData.trendVelocity,
            size: formData.trendSize,
            timing: formData.firstSeen
          },
          trendVelocity: formData.trendVelocity,
          trendSize: formData.trendSize,
          firstSeenTiming: formData.firstSeenTiming || formData.firstSeen,
          categoryAnswers: formData.categoryAnswers
        },
        virality_prediction: mapSpreadSpeedToScore(formData.spreadSpeed),
        quality_score: calculateQualityScore(formData), // Calculate actual quality score
        validation_count: 0,
        // Store the calculated payment amount
        payment_amount: finalPayment
        // Remove created_at - let database handle it
      };
      
      // Add optional fields that might exist in database
      if (formData.platform) submissionData.platform = formData.platform;
      if (formData.creator_handle) submissionData.creator_handle = formData.creator_handle;
      if (formData.creator_name) submissionData.creator_name = formData.creator_name;
      if (formData.post_caption) submissionData.post_caption = formData.post_caption;
      if (formData.likes_count !== undefined) submissionData.likes_count = parseInt(formData.likes_count) || 0;
      if (formData.comments_count !== undefined) submissionData.comments_count = parseInt(formData.comments_count) || 0;
      if (formData.shares_count !== undefined) submissionData.shares_count = parseInt(formData.shares_count) || 0;
      if (formData.views_count !== undefined) submissionData.views_count = parseInt(formData.views_count) || 0;
      if (formData.hashtags?.length) submissionData.hashtags = formData.hashtags;
      if (formData.thumbnail_url) submissionData.thumbnail_url = formData.thumbnail_url;
      if (screenshotUrl) submissionData.screenshot_url = screenshotUrl;
      if (formData.url) submissionData.post_url = formData.url; // Map URL to post_url
      if (formData.wave_score !== undefined) submissionData.wave_score = formData.wave_score;
      
      console.log('Submitting to Supabase:', submissionData);
      
      // Retry logic for submission
      let retries = 3;
      let data = null;
      let error = null;
      
      while (retries > 0 && !data) {
        try {
          // Create a promise that rejects after 45 seconds
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout after 45 seconds')), 45000);
          });
          
          // Race between the actual request and the timeout
          const result = await Promise.race([
            supabase
              .from('trend_submissions')
              .insert(submissionData)
              .select()
              .single(),
            timeoutPromise
          ]);
          
          if (result && typeof result === 'object' && 'data' in result) {
            data = (result as any).data;
            error = (result as any).error;
          }
          
          if (error) {
            console.error(`Submission attempt ${4 - retries} failed:`, error);
            console.error('Error details:', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            
            // Check for specific database errors
            if (error.message?.includes('column') || error.code === '42703') {
              console.error('Column error - payload might have invalid fields');
              setSubmitMessage({ 
                type: 'error', 
                text: `Database error: ${error.message}. Please refresh and try again.` 
              });
              setIsSubmitting(false);
              return; // Don't retry on column errors
            }
            
            retries--;
            if (retries > 0) {
              setRetryStatus(`Connection issue - retrying... (${retries} attempts left)`);
              console.log(`Retrying submission... (${retries} attempts left)`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            }
          } else {
            break; // Success!
          }
        } catch (timeoutError) {
          console.error(`Submission attempt ${4 - retries} timed out`);
          retries--;
          error = timeoutError;
          if (retries > 0) {
            setRetryStatus(`Request timed out - retrying... (${retries} attempts left)`);
            console.log(`Retrying after timeout... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (error || !data) {
        console.error('Final submission error after all retries:', error);
        
        // Don't let the form hang - close it and show error
        setShowSubmissionForm(false);
        setIsSubmitting(false);
        setRetryStatus(null); // Clear retry status
        
        const errorMessage = error?.message || 'Submission failed after multiple attempts';
        setSubmitMessage({ 
          type: 'error', 
          text: errorMessage.includes('timeout') 
            ? 'Connection timeout - please check your internet and try again' 
            : `Submission failed: ${errorMessage}` 
        });
        
        // Still hide message after 5 seconds
        setTimeout(() => setSubmitMessage(null), 5000);
        return; // Exit early instead of throwing
      }
      
      // Clear retry status on success
      setRetryStatus(null);
      
      // Log user data for debugging
      console.log('User data for earnings:', {
        id: user?.id,
        performance_tier: profileData?.performance_tier || user?.performance_tier,
        pending_earnings: (user as any)?.pending_earnings,
        trends_spotted: (user as any)?.trends_spotted,
        current_streak: profileData?.current_streak,
        session_streak: profileData?.session_streak
      });
      
      const userTier = profileData?.performance_tier || user?.performance_tier || 'learning';
      const tierMultiplier = earningsResult.tierMultiplier || 1.0;
      
      // Create earnings entry immediately to ensure pending earnings show up
      // Note: Database trigger may also create one, but we need immediate visibility
      try {
        const earningsEntry = {
          user_id: user.id,
          trend_id: (data as any).id, // Use trend_id field
          amount: finalPayment,
          type: 'trend_submission',
          status: 'pending',
          description: `Trend: ${formData.description || formData.trendName || 'Untitled'} - pending validation`,
          metadata: {
            base_amount: earningsResult.base,
            tier: userTier,
            tier_multiplier: earningsResult.tierMultiplier,
            session_position: profileData?.session_streak || 1,
            session_multiplier: earningsResult.sessionMultiplier,
            daily_streak: profileData?.current_streak || 0,
            daily_multiplier: earningsResult.dailyMultiplier,
            breakdown: earningsResult.breakdown
          }
        };
        
        console.log('💸 [SCROLL] Creating earnings ledger entry with amount:', earningsEntry.amount);
        console.log('💸 [SCROLL] Full earnings entry:', earningsEntry);
        
        const { data: ledgerData, error: earningsError } = await supabase
          .from('earnings_ledger')
          .insert(earningsEntry)
          .select()
          .single();
          
        if (earningsError) {
          console.error('❌ [SCROLL] Failed to create earnings ledger entry:', earningsError);
          console.error('❌ [SCROLL] Entry that failed:', earningsEntry);
          console.error('❌ [SCROLL] Error details:', {
            message: earningsError.message,
            code: earningsError.code,
            details: earningsError.details,
            hint: earningsError.hint
          });
        } else {
          console.log('✅ [SCROLL] Earnings ledger entry created successfully!', ledgerData);
          console.log('✅ [SCROLL] Amount added to ledger:', finalPayment, 'with multipliers');
          console.log('✅ [SCROLL] Ledger entry ID:', ledgerData?.id);
          
          // Update user_profiles table (profiles is a VIEW, can't update it)
          // CRITICAL: Also update streaks!
          const now = new Date();
          const lastSubmission = profileData?.last_submission_at ? new Date(profileData.last_submission_at) : null;
          
          // Calculate if this continues a daily streak
          let newDailyStreak = 1; // Default to 1 for first submission
          if (lastSubmission) {
            const hoursSinceLast = (now.getTime() - lastSubmission.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLast < 24) {
              // Within 24 hours - continue or maintain streak
              newDailyStreak = (profileData?.current_streak || 0) + 1;
            } else if (hoursSinceLast > 48) {
              // More than 48 hours - streak broken
              newDailyStreak = 1;
            } else {
              // Between 24-48 hours - maintain streak but don't increment
              newDailyStreak = profileData?.current_streak || 1;
            }
          }
          
          // Calculate session streak
          let newSessionStreak = 1;
          if (lastSubmission) {
            const minutesSinceLast = (now.getTime() - lastSubmission.getTime()) / (1000 * 60);
            if (minutesSinceLast <= 5) {
              // Within 5 minutes - continue session
              newSessionStreak = Math.min((profileData?.session_streak || 0) + 1, 5);
            } else {
              // New session
              newSessionStreak = 1;
            }
          }
          
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ 
              pending_earnings: ((user as any)?.pending_earnings || 0) + finalPayment,
              total_earned: ((user as any)?.total_earned || 0) + finalPayment,
              trends_spotted: ((user as any)?.trends_spotted || 0) + 1,
              current_streak: newDailyStreak,
              session_streak: newSessionStreak,
              last_submission_at: now.toISOString()
            })
            .eq('id', user.id);  // Primary key is 'id' not 'user_id'
            
          if (updateError) {
            console.error('❌ [SCROLL] Failed to update user_profiles:', updateError);
          } else {
            console.log('✅ [SCROLL] user_profiles updated successfully with:');
            console.log('  - Earnings:', finalPayment);
            console.log('  - Daily streak:', newDailyStreak);
            console.log('  - Session streak:', newSessionStreak);
          }
        }
      } catch (earningsError) {
        console.error('Exception creating earnings ledger entry:', earningsError);
      }
      
      // Update streak only if session is active
      if (session.isActive) {
        // Update global session context
        logTrendSubmission();
      }
      
      // Stats will be updated when user context refreshes
      
      console.log('Trend submitted with earnings:', finalPayment);
      
      // Reset form and close modal FIRST
      setShowSubmissionForm(false);
      setTrendUrl('');
      setIsSubmitting(false); // Ensure this is reset
      
      // Build multiplier breakdown for success message
      const multipliers = [];
      
      if (earningsResult.tierMultiplier !== 1.0) {
        multipliers.push(`${userTier} tier: ${earningsResult.tierMultiplier}x`);
      }
      
      if (earningsResult.sessionMultiplier !== 1.0) {
        multipliers.push(`session: ${earningsResult.sessionMultiplier}x`);
      }
      
      if (earningsResult.dailyMultiplier !== 1.0) {
        const dailyStreak = profileData?.current_streak || 0;
        multipliers.push(`${dailyStreak}-day streak: ${earningsResult.dailyMultiplier}x`);
      }
      
      const multiplierText = multipliers.length > 0 
        ? ` (${multipliers.join(', ')})` 
        : '';
      
      // Show earnings animation in bottom left corner
      const animationBreakdown = earningsResult.breakdown || [];
      
      // Trigger the earnings animation
      console.log('🎯 [SCROLL] Triggering earnings animation with amount:', finalPayment);
      console.log('🎯 [SCROLL] Animation breakdown:', animationBreakdown);
      
      // Calculate total multiplier for display
      const totalMultiplier = earningsResult.tierMultiplier * 
        earningsResult.sessionMultiplier * 
        earningsResult.dailyMultiplier;
      
      console.log('🎯 [SCROLL] Total multiplier for animation:', totalMultiplier);
      
      // This should show the animation in the bottom left corner
      showEarningsAnimation(finalPayment, animationBreakdown, totalMultiplier);
      
      console.log('🎯 [SCROLL] Animation function called successfully');
      
      // Show success message with pending verification note and multipliers
      setSubmitMessage({ 
        type: 'success', 
        text: `Trend submitted! Earning $${finalPayment.toFixed(2)}${multiplierText} - pending validation` 
      });
      
      // Close the submission form on success
      setShowSubmissionForm(false);
      setTrendUrl('');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSubmitMessage(null), 5000);
      
      // Update local earnings immediately (optimistic update)
      setTodaysPendingEarnings(prev => prev + finalPayment);
      setTrendsLoggedToday(prev => prev + 1);
      
      // Update user earnings - Direct update is WORKING!
      // Skip the RPC since it's failing due to missing columns
      try {
        console.log('💰 [SCROLL] Directly updating user_profiles with earnings:', finalPayment);
        
        // Get current earnings first
        const { data: currentProfile } = await supabase
          .from('user_profiles')
          .select('pending_earnings, total_earned')
          .eq('id', user.id)
          .single();
        
        const currentPending = currentProfile?.pending_earnings || 0;
        const currentTotal = currentProfile?.total_earned || 0;
        
        // Update with new earnings
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            pending_earnings: currentPending + finalPayment,
            total_earned: currentTotal + finalPayment
          })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('❌ [SCROLL] Failed to update earnings:', updateError);
        } else {
          console.log('✅ [SCROLL] Earnings updated successfully!');
          console.log('✅ [SCROLL] New pending:', currentPending + finalPayment);
        }
      } catch (error) {
        console.error('❌ [SCROLL] Exception updating earnings:', error);
      }
      
      // Update auth context for immediate UI update
      if (updateUserEarnings) {
        console.log('💰 [SCROLL] Updating auth context with:', finalPayment);
        await updateUserEarnings(finalPayment);
      }
      
      // FORCE IMMEDIATE REFRESH of user data
      console.log('🔄 [SCROLL] Force refreshing user data...');
      if (refreshUser) {
        await refreshUser(); // Refresh immediately, don't wait
        console.log('✅ [SCROLL] User data refreshed!');
      }
      
      // Also reload stats
      await loadTodaysStats();
      
      // Do another refresh after a delay to ensure everything syncs
      setTimeout(async () => {
        if (refreshUser) {
          await refreshUser();
          console.log('✅ [SCROLL] Second refresh complete');
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('Submission error caught:', error);
      const errorMessage = error?.message || error?.error_description || 'Failed to submit trend';
      
      // Make sure to close form and reset state on error
      setShowSubmissionForm(false);
      setIsSubmitting(false);
      
      setSubmitMessage({ 
        type: 'error', 
        text: `Error: ${errorMessage}` 
      });
      
      // Clear message after 5 seconds
      setTimeout(() => setSubmitMessage(null), 5000);
    } finally {
      // Always reset submitting state
      setIsSubmitting(false);
    }
  };


  const calculateEngagementScore = (data: any): number => {
    if (!data.views_count) return 5;
    const engagementRate = ((data.likes_count + data.comments_count + data.shares_count) / data.views_count) * 100;
    return Math.min(10, Math.round(engagementRate));
  };

  const mapSpreadSpeedToScore = (speed: string): number => {
    const map: Record<string, number> = {
      'viral': 9,
      'picking_up': 7,
      'just_starting': 5,
      'declining': 2
    };
    return map[speed] || 5;
  };

  const extractTickers = (text: string): string[] => {
    const tickerPattern = /\$[A-Z]{1,5}\b/g;
    const matches = text.match(tickerPattern) || [];
    return [...new Set(matches.map(t => t.replace('$', '')))];
  };

  const detectSentiment = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('moon') || lower.includes('rocket') || lower.includes('bull')) return 'bullish';
    if (lower.includes('bear') || lower.includes('crash') || lower.includes('dump')) return 'bearish';
    if (lower.includes('fomo')) return 'fomo';
    if (lower.includes('diamond') || lower.includes('hold')) return 'diamond_hands';
    return 'neutral';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="w-12 flex justify-start">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <WaveLogo size={32} animated={true} showTitle={false} />
              <h1 className="text-xl font-bold text-gray-900">Trend Scanner</h1>
            </div>
            
            {/* Reserve space for SpotterTierDisplay to prevent layout shift */}
            <div className="w-40 flex justify-end min-h-[44px] items-center">
              {user && (
                <SpotterTierDisplay userId={user.id} compact={true} />
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Success/Error Messages */}
        <AnimatePresence>
          {submitMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="mb-6"
            >
              <div className={`px-5 py-4 rounded-xl shadow-lg flex items-start gap-3 ${
                submitMessage.type === 'success'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300'
                  : 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-300'
              }`}>
                {submitMessage.type === 'success' ? (
                  <div className="flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                )}
                <div className="flex-1">
                  {submitMessage.type === 'success' ? (
                    <>
                      <div className="font-semibold text-green-800 mb-1">
                        Trend Successfully Submitted! 🎉
                      </div>
                      <div className="text-sm text-green-700">
                        {submitMessage.text}
                      </div>
                      <div className="mt-2 text-xs text-green-600 bg-green-100 inline-block px-2 py-1 rounded">
                        💡 Earnings will be confirmed after community validation
                      </div>
                    </>
                  ) : (
                    <div className="text-red-700">{submitMessage.text}</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Layout: Submit Trend (left) + Right column (Streak + Session) */}
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submit a Trend Section - Left Column */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Link className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">Submit a Trend</h2>
                <p className="text-sm text-gray-500">Paste a URL to start the 3-step submission</p>
              </div>
            </div>
            
            {/* Earnings Info */}
            <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  Base: <span className="font-semibold">${SUSTAINABLE_EARNINGS.base.trendSubmission}</span> per trend
                </span>
                <span className="text-green-700">
                  Paid after 3 validations ✓
                </span>
              </div>
            </div>

            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="url"
                  value={trendUrl}
                  onChange={(e) => setTrendUrl(e.target.value)}
                  onPaste={handleUrlPaste}
                  placeholder="Paste trend URL here..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  autoFocus
                />
                {trendUrl && (
                  <button
                    type="button"
                    onClick={() => setTrendUrl('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
              
              <button
                type="submit"
                disabled={!trendUrl}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Start Submission
              </button>
            </form>

            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <Sparkles className="w-4 h-4" />
              <span>Auto-captures creator info & metrics</span>
            </div>
          </div>

          {/* Right Column: Streak Display (top) + Scroll Session (bottom) */}
          <div className="flex flex-col gap-6">
            {/* Streak Display - Top Right */}
            <StreakDisplay />
            
            {/* Scroll Session Section - Bottom Right */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Scroll Session</h2>
                  <p className="text-sm text-gray-500">
                    {session.isActive ? 'Track your submission streak' : 'Optional: Track progress & streaks'}
                  </p>
                </div>
                
                <button
                  onClick={session.isActive ? endSession : startSession}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm ${
                    session.isActive 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {session.isActive ? (
                    <>
                      <Pause className="w-4 h-4" />
                      End
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Start
                    </>
                  )}
                </button>
              </div>

              {session.isActive ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-500">Duration</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{formatTime(session.duration)}</p>
                  </div>
                  
                  <div className="bg-purple-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-purple-600">Streak</span>
                    </div>
                    <p className="text-xl font-bold text-purple-700">
                      {session.currentStreak} {session.currentStreak > 0 && `(${session.streakMultiplier}x)`}
                    </p>
                  </div>
                  
                  {session.currentStreak > 0 && (
                    <div className="bg-orange-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Timer className="w-4 h-4 text-orange-500" />
                        <span className="text-xs text-orange-600">Time Left</span>
                      </div>
                      <p className="text-xl font-bold text-orange-700">{formatTime(session.streakTimeRemaining)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Zap className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-2">Streak Multipliers & Benefits</h3>
                      <ul className="text-sm text-gray-600 space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500">⚡</span>
                          <span><strong>2 trends:</strong> 1.2x multiplier unlocked</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-500">🔥</span>
                          <span><strong>5 trends:</strong> 2.0x multiplier (double rewards)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-500">💎</span>
                          <span><strong>15 trends:</strong> 3.0x multiplier (triple rewards)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500">⏱️</span>
                          <span><strong>30-min window:</strong> Submit within time to keep streak</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500">📊</span>
                          <span><strong>Live tracking:</strong> See timer, earnings & progress in real-time</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-xs text-gray-500">Today</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(todaysEarnings)}</p>
            <p className="text-xs text-gray-500">Confirmed</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-xs text-gray-500">Pending</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(todaysPendingEarnings || user?.pending_earnings || 0)}</p>
            <p className="text-xs text-gray-500">Verification</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <Flame className="w-5 h-5 text-purple-600" />
              <span className="text-xs text-gray-500">Multiplier</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{getStreakMultiplier(session.currentStreak)}x</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-gray-500">Trends</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{trendsLoggedToday}</p>
            <p className="text-xs text-gray-500">Today</p>
          </div>
        </div>


        {/* Recent Tickers */}
        {recentTickers.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-700">Recent Tickers:</span>
              <div className="flex gap-2">
                {recentTickers.map(ticker => (
                  <span key={ticker} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-mono">
                    ${ticker}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Platform Quick Access */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Quick Platform Access
          </h3>
          
          <div className="grid grid-cols-5 gap-3">
            {PLATFORMS.map(platform => (
              <button
                key={platform.id}
                onClick={() => handlePlatformClick(platform)}
                className={`p-4 ${platform.color} rounded-xl transition-all transform hover:scale-105 hover:shadow-lg text-white`}
              >
                <div className="text-3xl mb-2">{platform.icon}</div>
                <div className="text-xs font-medium">{platform.label}</div>
              </button>
            ))}
          </div>
        </div>


        {/* Finance Bonus Section */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Finance Trends = Extra Cash</h3>
                <p className="text-sm text-gray-600">Track meme stocks & crypto for bonus payments</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg font-semibold">
              +{formatCurrency(SUSTAINABLE_EARNINGS.base.approvalBonus)} approval bonus
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {['r/wallstreetbets', 'r/stocks', 'r/cryptocurrency', 'r/superstonk', 'StockTwits'].map(community => (
              <span key={community} className="px-3 py-1 bg-white rounded-lg text-sm text-gray-700">
                {community}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* 3-Step Trend Submission Form */}
      {showSubmissionForm && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Form</h3>
                <p className="text-gray-600 mb-4">Unable to load the submission form. Please try refreshing the page.</p>
                <button
                  onClick={() => {
                    setShowSubmissionForm(false);
                    setTrendUrl('');
                  }}
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <SmartTrendSubmission
            onClose={() => {
              setShowSubmissionForm(false);
              setTrendUrl('');
            }}
            onSubmit={handleTrendSubmit}
            initialUrl={trendUrl}
          />
        </ErrorBoundary>
      )}
      
      {/* Earnings Animation */}
      <EarningsAnimation
        amount={earningsData.amount}
        show={showEarnings}
        bonuses={earningsData.bonuses}
        multiplier={earningsData.multiplier}
        onComplete={hideEarningsAnimation}
      />
    </div>
  );
}