'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  DollarSign, 
  CheckCircle, 
  Trophy,
  BarChart,
  Home,
  ArrowLeft,
  Link,
  Send,
  Loader2
} from 'lucide-react';
import { ScrollSession } from '@/components/ScrollSession';
import { FloatingTrendLogger } from '@/components/FloatingTrendLogger';
import { SwipeableVerificationFeed } from '@/components/SwipeableVerificationFeed';
import { EarningsDashboard } from '@/components/EarningsDashboard';
import { StreaksAndChallenges } from '@/components/StreaksAndChallenges';
import { TrendRadar } from '@/components/TrendRadar';
import { useAuth } from '@/contexts/AuthContext';
import WaveLogo from '@/components/WaveLogo';

type TabType = 'scroll' | 'verify' | 'earnings' | 'challenges' | 'trends';

export default function ScrollDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('scroll');
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollSessionRef = useRef<any>();
  
  // Form states
  const [trendLink, setTrendLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [loggedTrends, setLoggedTrends] = useState<string[]>([]);

  // Handle trend logged from floating logger
  const handleTrendLogged = () => {
    scrollSessionRef.current?.logTrend();
  };

  // Normalize URL for duplicate checking
  const normalizeUrl = (url: string) => {
    try {
      const urlObj = new URL(url.trim());
      // Remove tracking parameters and fragments
      urlObj.search = '';
      urlObj.hash = '';
      return urlObj.toString().toLowerCase();
    } catch {
      return url.trim().toLowerCase();
    }
  };

  // Handle trend link submission
  const handleSubmitTrend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trendLink.trim()) return;

    const normalizedUrl = normalizeUrl(trendLink);
    
    // Check for duplicate
    if (loggedTrends.includes(normalizedUrl)) {
      setSubmitMessage({ type: 'error', text: 'Trend already logged! Find a new trending link to earn more.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Simulate API call - replace with actual submission logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Add to logged trends
      setLoggedTrends(prev => [...prev, normalizedUrl]);
      
      // Success feedback
      setSubmitMessage({ type: 'success', text: 'Trend logged successfully! +$0.25 earned' });
      setTrendLink('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSubmitMessage(null), 3000);
    } catch (error) {
      setSubmitMessage({ type: 'error', text: 'Failed to log trend. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'scroll' as const, label: 'Scroll', icon: TrendingUp },
    { id: 'verify' as const, label: 'Verify', icon: CheckCircle },
    { id: 'trends' as const, label: 'Trends', icon: BarChart },
    { id: 'earnings' as const, label: 'Earnings', icon: DollarSign },
    { id: 'challenges' as const, label: 'Challenges', icon: Trophy }
  ];

  // Generate dummy trend data for TrendRadar
  const generateDummyTrends = () => {
    const categories = ['fashion', 'wellness', 'meme', 'audio', 'tech', 'food', 'lifestyle'];
    const trends = [];
    
    for (let i = 0; i < 15; i++) {
      trends.push({
        id: `trend-${i}`,
        title: `Trending Item ${i + 1}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        viralityScore: Math.random() * 0.4 + 0.6,
        qualityScore: Math.random() * 0.3 + 0.7,
        validationCount: Math.floor(Math.random() * 300) + 50,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: `Description for trend ${i + 1}`,
        waveScore: Math.random() * 3 + 7
      });
    }
    
    return trends;
  };

  return (
    <div className="min-h-screen text-white">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-wave-800/50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-wave-400" />
              </button>
              <div className="flex items-center gap-3">
                <WaveLogo size={40} animated={true} showTitle={false} />
                <div>
                  <h1 className="text-2xl font-bold">Scroll & Earn</h1>
                  <p className="text-sm text-wave-400">
                    Discover trends, earn rewards
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-wave-800/50 hover:bg-wave-700/50 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Main Dashboard</span>
            </button>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex gap-2 p-2 bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                    font-medium transition-all duration-200 ease-in-out
                    ${activeTab === tab.id
                      ? 'bg-gradient-to-r from-wave-500 to-wave-600 text-white shadow-lg shadow-wave-500/25 border border-wave-400/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/70 border border-transparent'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Scroll Session (always visible) */}
          <div className="lg:col-span-1">
            <ScrollSession
              ref={scrollSessionRef}
              onSessionStateChange={setIsScrolling}
              onTrendLogged={() => {}}
            />
          </div>

          {/* Right Column - Tab Content */}
          <div className="lg:col-span-2">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-wave-900/30 backdrop-blur-xl rounded-2xl p-6 border border-wave-700/30 min-h-[600px]"
            >
              {activeTab === 'scroll' && (
                <div className="text-center py-12">
                  <div className="w-32 h-32 bg-wave-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-16 h-16 text-wave-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Find Trending Content & Earn
                  </h3>
                  <p className="text-wave-400 max-w-md mx-auto mb-6">
                    Go to TikTok or Instagram to discover trending content. When you find something viral, come back and log it to earn rewards!
                  </p>
                  
                  {/* Social Media Links */}
                  <div className="flex justify-center gap-4 mb-8">
                    <a
                      href="https://www.tiktok.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-black hover:bg-gray-800 rounded-xl transition-colors"
                    >
                      <div className="w-6 h-6 bg-gradient-to-r from-red-400 via-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs font-bold">T</span>
                      </div>
                      <span className="text-white font-medium">TikTok</span>
                    </a>
                    <a
                      href="https://www.instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl transition-colors"
                    >
                      <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                        <span className="text-pink-600 text-xs font-bold">📷</span>
                      </div>
                      <span className="text-white font-medium">Instagram</span>
                    </a>
                  </div>

                  <div className="bg-wave-800/30 rounded-xl p-6 mb-6 max-w-lg mx-auto">
                    <h4 className="text-lg font-semibold text-white mb-3">How it works:</h4>
                    <div className="text-left space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        <span className="text-wave-300">Click TikTok or Instagram above</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        <span className="text-wave-300">Browse and find trending content</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                        <span className="text-wave-300">Come back and start a scroll session</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                        <span className="text-wave-300">Log the trending links you found</span>
                      </div>
                    </div>
                  </div>

                  {/* Warning System */}
                  <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6 max-w-lg mx-auto">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-red-400 text-xl">⚠️</span>
                      <h4 className="text-lg font-semibold text-red-400">Important: Tier Warning System</h4>
                    </div>
                    <div className="text-sm text-red-200 space-y-2">
                      <p>• If you fail to log trends during a scroll session, you'll receive a <strong>strike</strong></p>
                      <p>• <strong>2 strikes</strong> = Demotion to non-earning tier</p>
                      <p>• Stay active and log trends to maintain your earning status!</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between bg-red-800/20 rounded-lg p-3">
                      <span className="text-red-300 text-sm font-medium">Current Strikes:</span>
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                        <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                        <span className="text-red-300 text-xs ml-2">0/2</span>
                      </div>
                    </div>
                  </div>

                  {/* Trend Submission Form */}
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 mb-6 max-w-lg mx-auto">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Link className="w-5 h-5 text-blue-400" />
                        <h4 className="text-lg font-semibold text-blue-400">Submit Trending Link</h4>
                      </div>
                      {loggedTrends.length > 0 && (
                        <div className="text-xs text-blue-300 bg-blue-800/30 px-2 py-1 rounded-lg">
                          {loggedTrends.length} logged today
                        </div>
                      )}
                    </div>
                    
                    <form onSubmit={handleSubmitTrend} className="space-y-4">
                      <div>
                        <label htmlFor="trend-link" className="block text-sm font-medium text-wave-300 mb-2">
                          Paste TikTok or Instagram link here:
                        </label>
                        <div className="relative">
                          <input
                            id="trend-link"
                            type="url"
                            value={trendLink}
                            onChange={(e) => setTrendLink(e.target.value)}
                            placeholder="https://www.tiktok.com/@user/video/... or https://www.instagram.com/p/..."
                            className="w-full px-4 py-3 bg-wave-800/50 border border-wave-600/30 rounded-lg text-white placeholder-wave-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                      
                      <button
                        type="submit"
                        disabled={!trendLink.trim() || isSubmitting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 rounded-lg font-medium text-white transition-colors"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Logging Trend...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Log Trend (+$0.25)
                          </>
                        )}
                      </button>
                    </form>

                    {/* Feedback Messages */}
                    {submitMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-4 p-3 rounded-lg ${
                          submitMessage.type === 'success'
                            ? 'bg-green-900/20 border border-green-500/30 text-green-400'
                            : 'bg-red-900/20 border border-red-500/30 text-red-400'
                        }`}
                      >
                        <p className="text-sm font-medium">{submitMessage.text}</p>
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    <div className="p-4 bg-wave-800/30 rounded-xl">
                      <p className="text-2xl font-bold text-white">$0.10</p>
                      <p className="text-sm text-wave-500">per minute</p>
                    </div>
                    <div className="p-4 bg-wave-800/30 rounded-xl">
                      <p className="text-2xl font-bold text-white">$0.25</p>
                      <p className="text-sm text-wave-500">per trend</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'verify' && (
                <div>
                  <SwipeableVerificationFeed />
                </div>
              )}

              {activeTab === 'trends' && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Trend Radar</h3>
                  <TrendRadar data={generateDummyTrends()} />
                </div>
              )}

              {activeTab === 'earnings' && (
                <EarningsDashboard />
              )}

              {activeTab === 'challenges' && (
                <StreaksAndChallenges />
              )}
            </motion.div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4"
        >
          <div className="bg-wave-900/50 backdrop-blur-sm rounded-xl p-4 border border-wave-700/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-wave-500">Today's Earnings</p>
                <p className="text-xl font-bold text-white">$0.00</p>
              </div>
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <div className="bg-wave-900/50 backdrop-blur-sm rounded-xl p-4 border border-wave-700/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-wave-500">Trends Logged</p>
                <p className="text-xl font-bold text-white">0</p>
              </div>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="bg-wave-900/50 backdrop-blur-sm rounded-xl p-4 border border-wave-700/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-wave-500">Verified</p>
                <p className="text-xl font-bold text-white">0</p>
              </div>
              <CheckCircle className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="bg-wave-900/50 backdrop-blur-sm rounded-xl p-4 border border-wave-700/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-wave-500">Current Streak</p>
                <p className="text-xl font-bold text-white">0</p>
              </div>
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
          <div className="bg-wave-900/50 backdrop-blur-sm rounded-xl p-4 border border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-400">Warning Strikes</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                  <span className="text-sm font-bold text-white ml-1">0/2</span>
                </div>
              </div>
              <span className="text-red-400 text-lg">⚠️</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Floating Trend Logger */}
      <FloatingTrendLogger 
        isVisible={isScrolling} 
        onTrendLogged={handleTrendLogged}
      />
    </div>
  );
}