'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import TrendIntelligenceForm from '@/components/TrendIntelligenceForm';
import { TrendIntelligenceService } from '@/services/TrendIntelligenceService';
import { TrendIntelligenceData } from '@/lib/trendIntelligenceConfig';
import { 
  Brain as BrainIcon, 
  TrendingUp as TrendingUpIcon,
  Award as AwardIcon,
  Target as TargetIcon,
  Users as UsersIcon,
  Users,  // Add this for the direct usage
  Sparkles as SparklesIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SubmitIntelligencePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (data: TrendIntelligenceData) => {
    if (!user?.id) {
      showError('Authentication required', 'Please log in to submit trend intelligence');
      router.push('/login');
      return;
    }

    setSubmitting(true);
    try {
      const result = await TrendIntelligenceService.submitTrendIntelligence(user.id, data);
      
      if (result.success) {
        showSuccess(
          'Intelligence submitted successfully!',
          'Your trend intelligence has been recorded and will help shape market insights'
        );
        setShowForm(false);
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        showError('Submission failed', result.error || 'Please try again');
      }
    } catch (error) {
      console.error('Error submitting trend intelligence:', error);
      showError('Unexpected error', 'Please try again later');
    } finally {
      setSubmitting(false);
    }
  };

  if (showForm) {
    return (
      <TrendIntelligenceForm
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-wave-900 via-black to-wave-900 p-4">
      <div className="max-w-6xl mx-auto py-12">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-wave-500/20 to-wave-600/20 rounded-2xl">
              <BrainIcon className="w-16 h-16 text-wave-400" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            WaveSight Trend Intelligence
          </h1>
          
          <p className="text-xl text-wave-300 mb-2">
            Capture not just what's trending, but <span className="text-wave-400 font-semibold">WHO</span> sees it, 
            <span className="text-wave-400 font-semibold"> HOW</span> they feel, and 
            <span className="text-wave-400 font-semibold"> WHETHER</span> it's real
          </p>
          
          <p className="text-wave-400 max-w-2xl mx-auto">
            Your intelligence helps brands, creators, and investors understand the true dynamics 
            behind viral content and emerging cultural movements
          </p>
        </motion.div>

        {/* Value Props */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          <div className="wave-card p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-wave-500/20 rounded-xl">
                <TrendingUpIcon className="w-8 h-8 text-wave-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Early Detection</h3>
            <p className="text-wave-400 text-sm">
              Spot trends before they peak. Your early intelligence is worth exponentially more
            </p>
          </div>

          <div className="wave-card p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-wave-500/20 rounded-xl">
                <TargetIcon className="w-8 h-8 text-wave-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Deep Context</h3>
            <p className="text-wave-400 text-sm">
              Go beyond surface metrics. Capture audience psychology and cultural significance
            </p>
          </div>

          <div className="wave-card p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-wave-500/20 rounded-xl">
                <AwardIcon className="w-8 h-8 text-wave-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Earn Rewards</h3>
            <p className="text-wave-400 text-sm">
              Quality intelligence earns more. The richer your data, the higher your rewards
            </p>
          </div>
        </motion.div>

        {/* Intelligence Framework */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="wave-card p-8 mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <SparklesIcon className="w-6 h-6 text-wave-400" />
            The Intelligence Framework
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-wave-200 mb-4">What We Capture</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-wave-400 rounded-full mt-2"></div>
                  <div>
                    <p className="text-wave-200 font-medium">Basic Trend Info</p>
                    <p className="text-wave-400 text-sm">Title, platform, URL, category</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-wave-400 rounded-full mt-2"></div>
                  <div>
                    <p className="text-wave-200 font-medium">Universal Intelligence</p>
                    <p className="text-wave-400 text-sm">Velocity, spread, size, AI detection, audience sentiment</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-wave-400 rounded-full mt-2"></div>
                  <div>
                    <p className="text-wave-200 font-medium">Category-Specific Insights</p>
                    <p className="text-wave-400 text-sm">Targeted questions based on trend type</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-wave-400 rounded-full mt-2"></div>
                  <div>
                    <p className="text-wave-200 font-medium">Context & Predictions</p>
                    <p className="text-wave-400 text-sm">Why it matters and where it's going</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-wave-200 mb-4">Why It's Valuable</h3>
              <div className="bg-wave-800/30 rounded-xl p-4 border border-wave-700/30">
                <p className="text-wave-300 mb-3">
                  Traditional trend tracking tells you <span className="text-wave-200 font-medium">"Stanley Cups are trending"</span>
                </p>
                <p className="text-wave-300 mb-3">
                  WaveSight Intelligence tells you:
                </p>
                <p className="text-wave-400 text-sm italic">
                  "Stanley Cups trending with Gen Z, velocity declining, sentiment shifting negative 
                  due to overconsumption discourse, brands oversaturating, human-created backlash forming"
                </p>
                <div className="mt-4 p-3 bg-wave-600/20 rounded-lg">
                  <p className="text-wave-200 text-sm font-medium">
                    This differential data is worth exponentially more to decision-makers
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Categories Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Users className="w-6 h-6 text-wave-400" />
            Intelligence Categories
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { icon: '⚖️', name: 'Political', desc: 'Movements & discourse' },
              { icon: '💰', name: 'Finance', desc: 'Markets & money' },
              { icon: '👗', name: 'Fashion', desc: 'Style & aesthetics' },
              { icon: '😂', name: 'Meme', desc: 'Viral formats' },
              { icon: '🎮', name: 'Gaming', desc: 'Games & community' },
              { icon: '🏡', name: 'Lifestyle', desc: 'Living trends' },
              { icon: '💪', name: 'Health', desc: 'Wellness & fitness' },
              { icon: '🎵', name: 'Music', desc: 'Songs & artists' },
              { icon: '🛍️', name: 'Brand', desc: 'Products & campaigns' },
              { icon: '✊', name: 'Social', desc: 'Causes & movements' }
            ].map((cat) => (
              <div key={cat.name} className="wave-card p-4 text-center hover:border-wave-500 transition-all">
                <div className="text-2xl mb-2">{cat.icon}</div>
                <p className="text-wave-200 font-medium text-sm">{cat.name}</p>
                <p className="text-wave-500 text-xs mt-1">{cat.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <button
            onClick={() => setShowForm(true)}
            className="px-8 py-4 bg-gradient-to-r from-wave-500 to-wave-600 hover:from-wave-400 hover:to-wave-500 rounded-xl font-semibold text-white transition-all transform hover:scale-105 shadow-lg hover:shadow-wave-500/25"
          >
            <BrainIcon className="w-5 h-5 inline mr-2" />
            Start Capturing Intelligence
          </button>
          
          <p className="text-wave-400 text-sm mt-4">
            Takes 2-3 minutes • Earn rewards immediately
          </p>
        </motion.div>
      </div>
    </div>
  );
}