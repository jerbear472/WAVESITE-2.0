'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Eye, 
  TrendingUp, 
  Plus,
  Sparkles,
  Clock,
  Target,
  Award,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function SpotPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSpotTrend = () => {
    router.push('/submit-trend');
  };

  const spotCategories = [
    { 
      id: 'viral', 
      label: 'Viral Content', 
      icon: '🔥', 
      xp: 50,
      description: 'Spot content going viral right now'
    },
    { 
      id: 'emerging', 
      label: 'Emerging Trends', 
      icon: '🌱', 
      xp: 75,
      description: 'Identify trends before they explode'
    },
    { 
      id: 'cultural', 
      label: 'Cultural Moments', 
      icon: '🎭', 
      xp: 100,
      description: 'Capture defining cultural shifts'
    },
    { 
      id: 'meme', 
      label: 'Meme Evolution', 
      icon: '🎨', 
      xp: 60,
      description: 'Track how memes evolve and spread'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-4">
            <Eye className="w-12 h-12 text-purple-600 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Cultural Spotting
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Spot trends, earn XP, build your cultural intelligence
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Today's Spots</p>
                <p className="text-3xl font-bold text-purple-600">0</p>
              </div>
              <Target className="w-8 h-8 text-purple-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">XP Earned</p>
                <p className="text-3xl font-bold text-green-600">0</p>
              </div>
              <Award className="w-8 h-8 text-green-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Streak</p>
                <p className="text-3xl font-bold text-orange-600">0</p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </motion.div>
        </div>

        {/* Main CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white text-center mb-8 shadow-xl"
        >
          <Sparkles className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Start Spotting</h2>
          <p className="text-lg mb-6 opacity-90">
            Find cultural waves before they crest. Earn XP for every valid spot.
          </p>
          <button
            onClick={handleSpotTrend}
            className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg"
          >
            <Plus className="inline-block mr-2" />
            Spot New Trend
          </button>
        </motion.div>

        {/* Spotting Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {spotCategories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
              onClick={handleSpotTrend}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{category.icon}</div>
                <div className="bg-purple-100 dark:bg-purple-900 px-3 py-1 rounded-full">
                  <span className="text-purple-600 dark:text-purple-300 font-bold text-sm">
                    +{category.xp} XP
                  </span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {category.label}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                {category.description}
              </p>
              <div className="flex items-center text-purple-600 dark:text-purple-400 group-hover:translate-x-2 transition-transform">
                <span className="text-sm font-semibold">Start Spotting</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tips Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-12 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-2xl p-8"
        >
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Pro Spotting Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">🎯</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Be First</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Spot trends in their first 24-48 hours for maximum XP
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">📊</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Add Context</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Explain why this trend matters culturally
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">🔮</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Predict Peaks</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Forecast when trends will peak for bonus XP
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">🔗</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Track Evolution</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Link trends to their parent trends for chain bonuses
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}