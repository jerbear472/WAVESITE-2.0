'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('week');

  // Mock data for demonstration
  const stats = {
    trendsSpotted: 245,
    waveScore: 8.7,
    earnings: 1234.56,
    accuracy: 89
  };

  const recentTrends = [
    { id: 1, title: 'Minimalist UI Design', score: 9.2, status: 'rising', platform: 'Twitter' },
    { id: 2, title: 'AI-Generated Music', score: 8.8, status: 'viral', platform: 'TikTok' },
    { id: 3, title: 'Sustainable Fashion', score: 7.5, status: 'steady', platform: 'Instagram' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="container-custom py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-light text-gray-900 dark:text-gray-100">
              Welcome back, <span className="font-normal text-gradient">{user?.email?.split('@')[0] || 'User'}</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Here's your trend intelligence overview
            </p>
          </div>
          <Link href="/submit" className="btn-primary">
            Submit Trend
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="card animate-scale-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Trends Spotted</p>
                <p className="text-3xl font-semibold mt-1">{stats.trendsSpotted}</p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">+12% this week</p>
              </div>
              <div className="text-4xl">📈</div>
            </div>
          </div>

          <div className="card animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Wave Score</p>
                <p className="text-3xl font-semibold mt-1">{stats.waveScore}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Out of 10</p>
              </div>
              <div className="text-4xl">🌊</div>
            </div>
          </div>

          <div className="card animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</p>
                <p className="text-3xl font-semibold mt-1">${stats.earnings}</p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">+$234 this month</p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>

          <div className="card animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy Rate</p>
                <p className="text-3xl font-semibold mt-1">{stats.accuracy}%</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Top 10% spotter</p>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Trends */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Recent Trends</h2>
                <select 
                  value={timeframe} 
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="text-sm border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-900"
                >
                  <option value="day">Last 24h</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                </select>
              </div>

              <div className="space-y-4">
                {recentTrends.map((trend) => (
                  <div key={trend.id} className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{trend.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{trend.platform}</span>
                          <span className={`text-sm font-medium ${
                            trend.status === 'viral' ? 'text-red-600 dark:text-red-400' :
                            trend.status === 'rising' ? 'text-green-600 dark:text-green-400' :
                            'text-gray-600 dark:text-gray-400'
                          }`}>
                            {trend.status === 'viral' ? '🔥 Viral' :
                             trend.status === 'rising' ? '📈 Rising' :
                             '➡️ Steady'}
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-semibold text-gradient">{trend.score}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">Wave Score</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/timeline" className="btn-secondary w-full mt-6">
                View All Trends
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link href="/scroll" className="block w-full btn-primary text-center">
                  Start Scrolling
                </Link>
                <Link href="/verify" className="block w-full btn-secondary text-center">
                  Verify Trends
                </Link>
                <Link href="/persona" className="block w-full btn-ghost text-center">
                  Update Persona
                </Link>
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Activity Feed</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm">Your trend "Minimalist UI" was verified</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm">New trend spotted in your niche</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm">Weekly report available</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">1 day ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}