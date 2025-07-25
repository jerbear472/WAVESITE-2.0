'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface TrendData {
  id: string;
  category: string;
  description: string;
  virality_prediction: number;
  status: string;
  quality_score: number;
  validation_count: number;
  created_at: string;
}

interface ClientData {
  id: string;
  username: string;
  email: string;
  trends_spotted: number;
  accuracy_score: number;
}

export default function ProfessionalDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');

  useEffect(() => {
    if (!user || user.view_mode !== 'professional') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [user, router, timeframe]);

  const fetchData = async () => {
    try {
      // Fetch trending data
      const cutoffDate = new Date();
      if (timeframe === '24h') {
        cutoffDate.setHours(cutoffDate.getHours() - 24);
      } else if (timeframe === '7d') {
        cutoffDate.setDate(cutoffDate.getDate() - 7);
      } else if (timeframe === '30d') {
        cutoffDate.setDate(cutoffDate.getDate() - 30);
      }

      const { data: trendsData, error: trendsError } = await supabase
        .from('trend_submissions')
        .select('*')
        .gte('created_at', cutoffDate.toISOString())
        .eq('status', 'approved')
        .order('quality_score', { ascending: false })
        .limit(20);

      if (trendsError) throw trendsError;
      setTrends(trendsData || []);

      // Fetch client data if admin
      if (user.role === 'admin' || user.permissions?.can_access_all_data) {
        const { data: clientsData, error: clientsError } = await supabase
          .from('user_profiles')
          .select('*')
          .order('accuracy_score', { ascending: false })
          .limit(10);

        if (clientsError) throw clientsError;
        setClients(clientsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      visual_style: '🎨',
      audio_music: '🎵',
      creator_technique: '🎬',
      meme_format: '😂',
      product_brand: '🛍️',
      behavior_pattern: '👥'
    };
    return icons[category] || '📊';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Professional Dashboard</h1>
        <p className="text-gray-600 mt-2">Advanced analytics and trend insights</p>
      </div>

      {/* Timeframe Selector */}
      <div className="mb-6 flex space-x-2">
        {['24h', '7d', '30d'].map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              timeframe === tf
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {tf === '24h' ? '24 Hours' : tf === '7d' ? '7 Days' : '30 Days'}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">{trends.length}</div>
          <div className="text-sm text-gray-500">Active Trends</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">
            {trends.filter(t => t.virality_prediction >= 8).length}
          </div>
          <div className="text-sm text-gray-500">High Potential</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">
            {(trends.reduce((sum, t) => sum + t.quality_score, 0) / trends.length * 100).toFixed(0)}%
          </div>
          <div className="text-sm text-gray-500">Avg Quality Score</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">
            {trends.reduce((sum, t) => sum + t.validation_count, 0)}
          </div>
          <div className="text-sm text-gray-500">Total Validations</div>
        </div>
      </div>

      {/* Trending Categories */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Trending Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(
            trends.reduce((acc, trend) => {
              acc[trend.category] = (acc[trend.category] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{getCategoryIcon(category)}</span>
                <span className="font-medium text-gray-900">
                  {category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Trends */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Top Trends</h2>
          <Link
            href="/professional/trends"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View All →
          </Link>
        </div>
        <div className="space-y-4">
          {trends.slice(0, 5).map((trend) => (
            <div key={trend.id} className="border-b border-gray-200 pb-4 last:border-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="text-lg mr-2">{getCategoryIcon(trend.category)}</span>
                    <h3 className="font-medium text-gray-900">{trend.description}</h3>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Virality: {trend.virality_prediction}/10</span>
                    <span>Quality: {(trend.quality_score * 100).toFixed(0)}%</span>
                    <span>{trend.validation_count} validations</span>
                  </div>
                </div>
                <div className="ml-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    trend.virality_prediction >= 8 ? 'bg-red-100 text-red-800' :
                    trend.virality_prediction >= 6 ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {trend.virality_prediction >= 8 ? 'Hot' :
                     trend.virality_prediction >= 6 ? 'Rising' : 'Emerging'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers (for admins) */}
      {clients.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Top Performers</h2>
            <Link
              href="/professional/clients"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trends</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clients.slice(0, 5).map((client) => (
                  <tr key={client.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{client.username}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {client.trends_spotted}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${client.accuracy_score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900">
                          {(client.accuracy_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}