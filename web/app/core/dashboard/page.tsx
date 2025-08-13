'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { subscriptionService } from '@/lib/subscriptionService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Filter, Download, Eye, BarChart, 
  Globe, Tag, AlertCircle, FileText, MapPin,
  Users, Clock, ChevronRight, Lock, Sparkles
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import WaveSightLogo from '@/components/WaveSightLogo';
import SimpleLoader from '@/components/SimpleLoader';

interface CoreTrend {
  id: string;
  description: string;
  category: string;
  validation_ratio: number;
  validation_count: number;
  created_at: string;
  region?: string;
  persona_segments?: string[];
  screenshot_url?: string;
}

interface CoreStats {
  trends_this_month: number;
  top_category: string;
  avg_confidence: number;
  regional_snapshot: string;
}

export default function CoreDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<CoreTrend[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [exportCount, setExportCount] = useState(0);
  const [monthlyTrendCount, setMonthlyTrendCount] = useState(0);
  const [userTier, setUserTier] = useState<'core' | null>(null);
  const [stats, setStats] = useState<CoreStats>({
    trends_this_month: 0,
    top_category: 'N/A',
    avg_confidence: 0,
    regional_snapshot: 'Global'
  });

  const CORE_CATEGORIES = ['fashion', 'food', 'memes', 'music', 'tech'];
  const MONTHLY_TREND_LIMIT = 10;
  const MONTHLY_EXPORT_LIMIT = 10;

  useEffect(() => {
    if (user) {
      checkSubscription();
      fetchCoreTrends();
      fetchUsageStats();
    }
  }, [user, selectedCategory]);

  const checkSubscription = async () => {
    if (!user) return;
    
    const tier = await subscriptionService.getUserTier(user.id);
    if (tier !== 'core') {
      window.location.href = '/pricing';
      return;
    }
    setUserTier('core');
  };

  const fetchCoreTrends = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get current month's start date
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      let query = supabase
        .from('trend_submissions')
        .select('*')
        .gte('created_at', monthStart.toISOString())
        .gt('validation_ratio', 0.7)
        .order('validation_ratio', { ascending: false })
        .limit(MONTHLY_TREND_LIMIT);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      } else {
        query = query.in('category', CORE_CATEGORIES);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate stats
      if (data) {
        const categoryCount = new Map();
        let totalConfidence = 0;

        data.forEach(trend => {
          categoryCount.set(trend.category, (categoryCount.get(trend.category) || 0) + 1);
          totalConfidence += trend.validation_ratio;
        });

        const topCategory = Array.from(categoryCount.entries())
          .sort((a, b) => b[1] - a[1])[0];

        setStats({
          trends_this_month: data.length,
          top_category: topCategory ? topCategory[0] : 'N/A',
          avg_confidence: data.length > 0 ? (totalConfidence / data.length * 100) : 0,
          regional_snapshot: 'United States'
        });

        setTrends(data);
        setMonthlyTrendCount(data.length);
      }

      // Log feature access
      await subscriptionService.logFeatureAccess(user.id, 'core_dashboard', 'view', {
        category: selectedCategory
      });

    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { count } = await supabase
        .from('feature_access_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('access_type', 'export')
        .gte('created_at', monthStart.toISOString());

      setExportCount(count || 0);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const handleExport = async (exportFormat: 'csv' | 'pdf') => {
    if (!user) return;

    if (exportCount >= MONTHLY_EXPORT_LIMIT) {
      alert(`Monthly export limit (${MONTHLY_EXPORT_LIMIT}) reached. Upgrade to Pro for unlimited exports.`);
      return;
    }

    try {
      await subscriptionService.logFeatureAccess(user.id, 'export_report', 'export', {
        format: exportFormat,
        trend_count: trends.length
      });

      // Simple CSV export
      if (exportFormat === 'csv') {
        const csvContent = [
          ['Trend', 'Category', 'Confidence', 'Validations', 'Date'],
          ...trends.map(t => [
            t.description,
            t.category,
            `${(t.validation_ratio * 100).toFixed(1)}%`,
            t.validation_count.toString(),
            format(new Date(t.created_at), 'yyyy-MM-dd')
          ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wavesight-core-trends-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
      }

      setExportCount(prev => prev + 1);
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      'fashion': '👗',
      'food': '🍔',
      'memes': '😂',
      'music': '🎵',
      'tech': '💻'
    };
    return emojiMap[category] || '📊';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <WaveSightLogo size="lg" showText={true} />
          <div className="mt-6">
            <SimpleLoader size="large" />
          </div>
          <p className="text-gray-600 mt-4">Loading Core Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <WaveSightLogo size="md" showText={true} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">WaveSight Core</h1>
                <p className="text-sm text-gray-600">Essential trend intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Core Plan
              </div>
              <Link href="/professional/dashboard" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                Upgrade to Pro <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Usage Stats Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 mb-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">Monthly Usage</h2>
              <div className="flex gap-6">
                <div>
                  <p className="text-blue-100 text-sm">Trends Viewed</p>
                  <p className="text-2xl font-bold">{monthlyTrendCount}/{MONTHLY_TREND_LIMIT}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">Exports Used</p>
                  <p className="text-2xl font-bold">{exportCount}/{MONTHLY_EXPORT_LIMIT}</p>
                </div>
              </div>
            </div>
            <Sparkles className="w-16 h-16 text-white/20" />
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-blue-500" />
              <span className="text-2xl font-bold">{stats.trends_this_month}</span>
            </div>
            <p className="text-sm text-gray-600">Trends This Month</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <Tag className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold">{getCategoryEmoji(stats.top_category)}</span>
            </div>
            <p className="text-sm text-gray-600">Top Category</p>
            <p className="text-xs text-gray-500 capitalize">{stats.top_category}</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <BarChart className="w-8 h-8 text-green-500" />
              <span className="text-2xl font-bold">{stats.avg_confidence.toFixed(0)}%</span>
            </div>
            <p className="text-sm text-gray-600">Avg Confidence</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <MapPin className="w-8 h-8 text-orange-500" />
              <span className="text-lg font-bold">🇺🇸</span>
            </div>
            <p className="text-sm text-gray-600">Regional Focus</p>
            <p className="text-xs text-gray-500">{stats.regional_snapshot}</p>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {CORE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {getCategoryEmoji(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={exportCount >= MONTHLY_EXPORT_LIMIT}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  exportCount >= MONTHLY_EXPORT_LIMIT 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={exportCount >= MONTHLY_EXPORT_LIMIT}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  exportCount >= MONTHLY_EXPORT_LIMIT 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Trends Grid */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top 10 Emerging Trends</h3>
          
          <div className="space-y-4">
            {trends.length > 0 ? (
              trends.map((trend, index) => (
                <motion.div
                  key={trend.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getCategoryEmoji(trend.category)}</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium capitalize">
                          {trend.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(trend.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <h4 className="text-base font-semibold text-gray-900 mb-2">
                        {trend.description}
                      </h4>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{trend.validation_count} validations</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{(trend.validation_ratio * 100).toFixed(0)}% confidence</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Basic diffusion tracking</span>
                        </div>
                      </div>
                    </div>
                    {trend.screenshot_url && (
                      <img 
                        src={trend.screenshot_url} 
                        alt="Trend"
                        className="w-20 h-20 object-cover rounded-lg ml-4"
                      />
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No trends available this month</p>
                <p className="text-sm text-gray-400 mt-2">Check back later for new emerging trends</p>
              </div>
            )}
          </div>
        </div>

        {/* Upgrade Prompt */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Want More Insights?</h3>
              <p className="text-sm text-gray-600 mb-3">Upgrade to Pro for unlimited trends, real-time feeds, and predictive alerts</p>
              <div className="flex flex-wrap gap-2">
                {['Real-time updates', 'All categories', 'Persona deep dives', 'Unlimited exports'].map(feature => (
                  <span key={feature} className="px-2 py-1 bg-white rounded text-xs text-gray-700">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            <Link 
              href="/pricing"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Upgrade to Pro
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}