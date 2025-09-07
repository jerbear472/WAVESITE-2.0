'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Clock, Zap, TrendingUp, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DailyMomentProps {
  promptId: string;
  promptText: string;
  windowClosesAt: string;
  onComplete?: () => void;
}

export default function DailyMoment({ promptId, promptText, windowClosesAt, onComplete }: DailyMomentProps) {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState<number>(120); // 2 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trendText, setTrendText] = useState('');
  const [platform, setPlatform] = useState('');
  const [location, setLocation] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');

  // Calculate time left
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const windowClose = new Date(windowClosesAt).getTime();
      const difference = windowClose - now;
      
      if (difference > 0) {
        setTimeLeft(Math.floor(difference / 1000));
      } else {
        setTimeLeft(0);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [windowClosesAt]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle screenshot selection
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle submission
  const handleSubmit = async () => {
    if (!user || !trendText.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Upload screenshot if provided
      let screenshotUrl = null;
      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('screenshots')
          .upload(`daily-moments/${fileName}`, screenshot);
          
        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('screenshots')
            .getPublicUrl(`daily-moments/${fileName}`);
          screenshotUrl = publicUrl;
        }
      }

      // Calculate submission time
      const promptTime = new Date(windowClosesAt).getTime() - (120 * 1000); // Window opened 2 min before close
      const submissionTime = Math.floor((Date.now() - promptTime) / 1000);
      const onTime = submissionTime <= 120;

      // Submit to database
      const { error } = await supabase
        .from('daily_moment_submissions')
        .insert({
          prompt_id: promptId,
          user_id: user.id,
          trend_spotted: trendText,
          screenshot_url: screenshotUrl,
          platform,
          location,
          submission_time_seconds: submissionTime,
          on_time: onTime
        });

      if (error) throw error;

      setSubmitted(true);
      
      // Award XP for on-time submission
      if (onTime) {
        await supabase.rpc('award_xp', {
          p_user_id: user.id,
          p_amount: 15, // 15 XP for daily moment
          p_type: 'daily_moment',
          p_description: 'Daily Moment submitted on time'
        });
      }

      if (onComplete) {
        setTimeout(onComplete, 2000);
      }
    } catch (error) {
      console.error('Error submitting daily moment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Time's up
  if (timeLeft === 0 && !submitted) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-2xl font-bold mb-2">Time's Up!</h2>
          <p className="text-gray-600 mb-6">
            The 2-minute window has closed. Come back tomorrow for the next Daily Moment!
          </p>
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium"
          >
            Got it
          </button>
        </motion.div>
      </div>
    );
  }

  // Submitted successfully
  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="text-6xl mb-4"
          >
            ✅
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Moment Captured!</h2>
          <p className="text-gray-600 mb-6">
            You'll see everyone's moments when the window closes.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>+15 XP earned</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden"
      >
        {/* Header with timer */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Daily Moment</h2>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              timeLeft < 30 ? 'bg-red-500' : 'bg-white/20'
            }`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <p className="text-white/90">{promptText}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Trend input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What trend are you seeing right now? *
            </label>
            <textarea
              value={trendText}
              onChange={(e) => setTrendText(e.target.value)}
              placeholder="Everyone's doing/talking about..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
              maxLength={280}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {trendText.length}/280
            </div>
          </div>

          {/* Screenshot upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Screenshot (optional)
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                className="hidden"
                id="screenshot-upload"
              />
              <label
                htmlFor="screenshot-upload"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
              >
                <Camera className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">
                  {screenshot ? 'Change screenshot' : 'Add screenshot'}
                </span>
              </label>
              {screenshotPreview && (
                <img 
                  src={screenshotPreview} 
                  alt="Preview" 
                  className="mt-2 w-full h-32 object-cover rounded-lg"
                />
              )}
            </div>
          </div>

          {/* Platform and location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select...</option>
                <option value="tiktok">TikTok</option>
                <option value="twitter">Twitter/X</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="irl">IRL</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="NYC, Online..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !trendText.trim()}
            className={`w-full py-3 rounded-lg font-medium transition-all ${
              isSubmitting || !trendText.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Moment'}
          </button>

          {/* Info */}
          <div className="text-center text-xs text-gray-500">
            Submit within 2 minutes to maintain your streak!
          </div>
        </div>
      </motion.div>
    </div>
  );
}