'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SUSTAINABLE_EARNINGS, formatCurrency } from '@/lib/SUSTAINABLE_EARNINGS';
import {
  ChevronRight, ChevronLeft, Check, Star, TrendingUp,
  DollarSign, Users, Award, Zap, Smartphone, Globe,
  Target, Rocket, Play, Camera, Search, ThumbsUp,
  CreditCard, Gift, ArrowRight
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
  icon: React.ReactNode;
  action?: () => Promise<void>;
}

export default function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const supabase = createClientComponentClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [userPreferences, setUserPreferences] = useState({
    categories: [] as string[],
    platforms: [] as string[],
    goals: [] as string[],
    experience: '',
    paymentMethod: '',
  });
  const [loading, setLoading] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to WaveSight!',
      subtitle: 'Turn your social media scrolling into real earnings',
      icon: <Rocket className="w-16 h-16 text-blue-600" />,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-2xl">
            <h1 className="text-4xl font-bold mb-4">Get Paid to Spot Trends!</h1>
            <p className="text-xl opacity-90">
              Join thousands earning ${SUSTAINABLE_EARNINGS.base.trendSubmission}-${SUSTAINABLE_EARNINGS.caps.maxPerSubmission} per trend
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border">
              <DollarSign className="w-10 h-10 text-green-600 mb-3" />
              <h3 className="font-bold mb-2">Earn Real Money</h3>
              <p className="text-sm text-gray-600">
                ${SUSTAINABLE_EARNINGS.base.trendSubmission} base + bonuses up to ${SUSTAINABLE_EARNINGS.caps.maxPerSubmission} per trend
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border">
              <TrendingUp className="w-10 h-10 text-blue-600 mb-3" />
              <h3 className="font-bold mb-2">Spot Viral Trends</h3>
              <p className="text-sm text-gray-600">
                Be the first to identify trending content across social media
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border">
              <Award className="w-10 h-10 text-purple-600 mb-3" />
              <h3 className="font-bold mb-2">Level Up</h3>
              <p className="text-sm text-gray-600">
                Progress through tiers and earn up to 3x multipliers
              </p>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>🎉 New User Bonus:</strong> Complete onboarding to unlock your first $5 bonus!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'how-it-works',
      title: 'How It Works',
      subtitle: 'Three simple steps to start earning',
      icon: <Play className="w-16 h-16 text-green-600" />,
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex gap-4 p-6 bg-white rounded-xl border"
            >
              <div className="bg-blue-100 p-3 rounded-full h-fit">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold mb-2">1. Spot Trends</h3>
                <p className="text-gray-600 mb-3">
                  Browse TikTok, Instagram, Twitter, or YouTube and find viral or emerging content
                </p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">You earn:</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(SUSTAINABLE_EARNINGS.base.trendSubmission)} base</p>
                </div>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-4 p-6 bg-white rounded-xl border"
            >
              <div className="bg-green-100 p-3 rounded-full h-fit">
                <Camera className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold mb-2">2. Submit with Details</h3>
                <p className="text-gray-600 mb-3">
                  Add screenshots, descriptions, and metadata to earn quality bonuses
                </p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Quality bonuses:</p>
                  <p className="text-lg font-bold text-green-600">+{formatCurrency(0.70)} possible</p>
                </div>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-4 p-6 bg-white rounded-xl border"
            >
              <div className="bg-purple-100 p-3 rounded-full h-fit">
                <ThumbsUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold mb-2">3. Get Approved & Earn More</h3>
                <p className="text-gray-600 mb-3">
                  When your trend gets validated by the community, earn approval bonuses
                </p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Approval bonus:</p>
                  <p className="text-lg font-bold text-green-600">+{formatCurrency(SUSTAINABLE_EARNINGS.base.approvalBonus)}</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Pro Tip:</strong> You can also earn {formatCurrency(SUSTAINABLE_EARNINGS.base.validationVote)} for each trend you validate!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'categories',
      title: 'Choose Your Interests',
      subtitle: 'Select categories you want to focus on',
      icon: <Target className="w-16 h-16 text-purple-600" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-600">
            Select at least 3 categories you're interested in. This helps us show you relevant trends to validate.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { id: 'humor', label: 'Humor & Memes', icon: '😂' },
              { id: 'finance', label: 'Finance & Crypto', icon: '💰', bonus: true },
              { id: 'fashion', label: 'Fashion & Style', icon: '👗' },
              { id: 'technology', label: 'Tech & AI', icon: '🤖' },
              { id: 'food', label: 'Food & Cooking', icon: '🍔' },
              { id: 'fitness', label: 'Fitness & Health', icon: '💪' },
              { id: 'beauty', label: 'Beauty & Makeup', icon: '💄' },
              { id: 'travel', label: 'Travel & Adventure', icon: '✈️' },
              { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
              { id: 'education', label: 'Education', icon: '📚' },
              { id: 'gaming', label: 'Gaming', icon: '🎮' },
              { id: 'pets', label: 'Pets & Animals', icon: '🐶' },
            ].map(category => (
              <button
                key={category.id}
                onClick={() => {
                  setUserPreferences(prev => ({
                    ...prev,
                    categories: prev.categories.includes(category.id)
                      ? prev.categories.filter(c => c !== category.id)
                      : [...prev.categories, category.id]
                  }));
                }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  userPreferences.categories.includes(category.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{category.icon}</div>
                <p className="text-sm font-medium">{category.label}</p>
                {category.bonus && (
                  <p className="text-xs text-green-600 mt-1">+10% bonus</p>
                )}
              </button>
            ))}
          </div>
          
          {userPreferences.categories.length < 3 && (
            <p className="text-sm text-red-600">
              Please select at least 3 categories to continue
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'platforms',
      title: 'Select Your Platforms',
      subtitle: 'Which social media platforms do you use?',
      icon: <Smartphone className="w-16 h-16 text-blue-600" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-600">
            Select the platforms you actively use. You'll earn more for multi-platform trends!
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'tiktok', label: 'TikTok', icon: '🎵', color: 'bg-black' },
              { id: 'instagram', label: 'Instagram', icon: '📷', color: 'bg-gradient-to-br from-purple-600 to-pink-600' },
              { id: 'twitter', label: 'Twitter/X', icon: '🐦', color: 'bg-blue-500' },
              { id: 'youtube', label: 'YouTube', icon: '📺', color: 'bg-red-600' },
              { id: 'reddit', label: 'Reddit', icon: '🤖', color: 'bg-orange-600' },
              { id: 'linkedin', label: 'LinkedIn', icon: '💼', color: 'bg-blue-700' },
            ].map(platform => (
              <button
                key={platform.id}
                onClick={() => {
                  setUserPreferences(prev => ({
                    ...prev,
                    platforms: prev.platforms.includes(platform.id)
                      ? prev.platforms.filter(p => p !== platform.id)
                      : [...prev.platforms, platform.id]
                  }));
                }}
                className={`p-6 rounded-xl border-2 transition-all ${
                  userPreferences.platforms.includes(platform.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg ${platform.color} flex items-center justify-center text-white text-2xl mb-3 mx-auto`}>
                  {platform.icon}
                </div>
                <p className="font-medium">{platform.label}</p>
              </button>
            ))}
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>💰 Multi-Platform Bonus:</strong> Submit trends from multiple platforms to earn +{formatCurrency(SUSTAINABLE_EARNINGS.qualityBonuses.multiplePlatforms)} per trend!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'payment',
      title: 'Setup Payment Method',
      subtitle: 'How would you like to get paid?',
      icon: <CreditCard className="w-16 h-16 text-green-600" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-600">
            Choose your preferred payment method. You can change this anytime in settings.
          </p>
          
          <div className="space-y-3">
            {SUSTAINABLE_EARNINGS.paymentMethods.map(method => (
              <button
                key={method.id}
                onClick={() => {
                  setUserPreferences(prev => ({
                    ...prev,
                    paymentMethod: method.id
                  }));
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  userPreferences.paymentMethod === method.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-lg">{method.name}</p>
                    <p className="text-sm text-gray-600">
                      Min: {formatCurrency(method.minAmount)}
                      {method.fee > 0 && ` • Fee: ${formatCurrency(method.fee)}`}
                    </p>
                  </div>
                  {userPreferences.paymentMethod === method.id && (
                    <Check className="w-6 h-6 text-green-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>🎁 First Cashout Bonus:</strong> Get an extra $2 on your first cashout of $25 or more!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      subtitle: 'Start earning money from trends',
      icon: <Gift className="w-16 h-16 text-green-600" />,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-8 rounded-2xl text-center">
            <Star className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">Welcome Aboard!</h2>
            <p className="text-xl opacity-90">Your $5 welcome bonus has been added</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl border">
            <h3 className="font-bold mb-4">Your Quick Start Guide:</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <span className="text-lg">1️⃣</span>
                </div>
                <p className="text-sm">Submit your first trend to earn ${SUSTAINABLE_EARNINGS.base.trendSubmission}+</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <span className="text-lg">2️⃣</span>
                </div>
                <p className="text-sm">Validate 10 trends to earn an extra ${(SUSTAINABLE_EARNINGS.base.validationVote * 10).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <span className="text-lg">3️⃣</span>
                </div>
                <p className="text-sm">Reach Verified tier for 1.0x earnings multiplier</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <Zap className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Daily Goal</p>
              <p className="text-2xl font-bold text-yellow-700">$10</p>
              <p className="text-xs text-gray-600">~5 quality trends</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Weekly Goal</p>
              <p className="text-2xl font-bold text-purple-700">$50</p>
              <p className="text-xs text-gray-600">Unlock achievements</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = async () => {
    const currentStepData = steps[currentStep];
    
    // Validate current step
    if (currentStep === 2 && userPreferences.categories.length < 3) {
      return; // Don't proceed if categories not selected
    }
    
    if (currentStep === 3 && userPreferences.platforms.length === 0) {
      return; // Don't proceed if no platforms selected
    }
    
    // Mark step as completed
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    
    // Move to next step or complete
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Save user preferences
        await supabase
          .from('user_profiles')
          .update({
            preferred_categories: userPreferences.categories,
            preferred_platforms: userPreferences.platforms,
            payment_method: userPreferences.paymentMethod,
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        
        // Add welcome bonus
        await supabase.rpc('record_earnings_transaction', {
          p_user_id: user.id,
          p_transaction_type: 'adjustment',
          p_amount: 5.00,
          p_description: 'Welcome bonus for completing onboarding',
          p_metadata: { type: 'welcome_bonus' }
        });
      }
      
      // Mark onboarding as complete
      localStorage.setItem('onboardingCompleted', 'true');
      onComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">
              Step {currentStep + 1} of {steps.length}
            </p>
            <p className="text-sm font-medium text-gray-600">
              {Math.round(progress)}% Complete
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            {/* Step Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-4">
                {currentStepData.icon}
              </div>
              <h2 className="text-3xl font-bold mb-2">{currentStepData.title}</h2>
              <p className="text-gray-600">{currentStepData.subtitle}</p>
            </div>

            {/* Step Content */}
            <div className="mb-8">
              {currentStepData.content}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  currentStep === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>

              <div className="flex gap-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentStep
                        ? 'bg-blue-600'
                        : completedSteps.has(index)
                        ? 'bg-green-600'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={loading || (currentStep === 2 && userPreferences.categories.length < 3)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  loading || (currentStep === 2 && userPreferences.categories.length < 3)
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                }`}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    {loading ? 'Setting up...' : 'Start Earning'}
                    <Rocket className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Skip Option */}
        {currentStep < steps.length - 2 && (
          <div className="text-center mt-4">
            <button
              onClick={() => setCurrentStep(steps.length - 1)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip onboarding
            </button>
          </div>
        )}
      </div>
    </div>
  );
}