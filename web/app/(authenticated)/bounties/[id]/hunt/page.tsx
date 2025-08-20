'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Target,
  Clock,
  Upload,
  Camera,
  Check,
  AlertCircle,
  Zap,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface Bounty {
  id: string;
  title: string;
  description: string;
  requirements?: string[];
  price_per_spot: number;
  urgency_level: string;
  expires_at: string;
  targeting?: {
    platforms?: string[];
    expertise?: string[];
  };
}

export default function BountyHuntPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { user } = useAuth();
  
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    evidence_url: '',
    screenshot_url: '',
    platform: '',
    category: '',
    impact_score: 5
  });
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    fetchBounty();
  }, [params.id]);

  useEffect(() => {
    if (bounty?.expires_at) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const expires = new Date(bounty.expires_at).getTime();
        const difference = expires - now;

        if (difference > 0) {
          const hours = Math.floor(difference / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft('Expired');
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [bounty]);

  const fetchBounty = async () => {
    try {
      const { data, error } = await supabase
        .from('bounties')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setBounty(data);
    } catch (error) {
      console.error('Error fetching bounty:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bounty) return;

    setSubmitting(true);
    try {
      // Create the trend submission
      const { data: trend, error: trendError } = await supabase
        .from('trends')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          evidence_url: formData.evidence_url,
          screenshot_url: formData.screenshot_url,
          platform: formData.platform,
          category: formData.category,
          impact_score: formData.impact_score,
          is_bounty_submission: true
        })
        .select()
        .single();

      if (trendError) throw trendError;

      // Create the bounty submission
      const { error: submissionError } = await supabase
        .from('bounty_submissions')
        .insert({
          bounty_id: bounty.id,
          user_id: user.id,
          trend_id: trend.id,
          status: 'pending',
          price_per_spot: bounty.price_per_spot
        });

      if (submissionError) throw submissionError;

      // Success!
      router.push(`/bounties?success=true&bounty=${bounty.title}`);
    } catch (error) {
      console.error('Error submitting bounty:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'lightning': return 'bg-red-500';
      case 'rapid': return 'bg-orange-500';
      default: return 'bg-blue-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Bounty not found</h2>
          <button
            onClick={() => router.push('/bounties')}
            className="text-blue-500 hover:underline"
          >
            Back to Bounties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/bounties')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getUrgencyColor(bounty.urgency_level)}`}>
                <Zap className="w-4 h-4 inline mr-1" />
                {timeLeft}
              </div>
              <div className="text-lg font-bold text-green-600">
                ${bounty.price_per_spot}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bounty Details */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{bounty.title}</h1>
              <p className="text-gray-600">{bounty.description}</p>
            </div>
          </div>

          {/* Requirements */}
          {bounty.requirements && bounty.requirements.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Requirements</h3>
              <ul className="space-y-2">
                {bounty.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 mt-0.5" />
                    <span className="text-gray-700">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Targeting */}
          {bounty.targeting && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Looking For</h3>
              <div className="flex flex-wrap gap-2">
                {bounty.targeting.platforms?.map(platform => (
                  <span key={platform} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {platform}
                  </span>
                ))}
                {bounty.targeting.expertise?.map(exp => (
                  <span key={exp} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submission Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">Submit Your Find</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trend Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Gen Z abandoning Instagram for BeReal"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Impact Description *
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explain why this matters to businesses..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Platform & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform *
                </label>
                <select
                  required
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select platform</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">Twitter/X</option>
                  <option value="youtube">YouTube</option>
                  <option value="reddit">Reddit</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  <option value="consumer_behavior">Consumer Behavior</option>
                  <option value="brand_sentiment">Brand Sentiment</option>
                  <option value="emerging_platform">Emerging Platform</option>
                  <option value="viral_campaign">Viral Campaign</option>
                  <option value="market_shift">Market Shift</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Evidence URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evidence URL *
              </label>
              <input
                type="url"
                required
                value={formData.evidence_url}
                onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Screenshot URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Screenshot URL (optional)
              </label>
              <input
                type="url"
                value={formData.screenshot_url}
                onChange={(e) => setFormData({ ...formData, screenshot_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Impact Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Impact Score (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.impact_score}
                onChange={(e) => setFormData({ ...formData, impact_score: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Low</span>
                <span className="font-bold text-lg text-blue-600">{formData.impact_score}</span>
                <span>High</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : `Submit for $${bounty.price_per_spot}`}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}