'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import { 
  EARNINGS_STANDARD,
  formatEarnings
} from '@/lib/EARNINGS_STANDARD';
import SimpleLoader from '@/components/SimpleLoader';
import {
  Clock as ClockIcon,
  Check as CheckIcon,
  X as XIcon,
  TrendingUp as TrendingUpIcon,
  DollarSign as DollarSignIcon,
  Image as ImageIcon,
  Link as LinkIcon
} from 'lucide-react';

interface Submission {
  id: string;
  created_at: string;
  description: string;
  screenshot_url?: string;
  post_url?: string;
  status: 'submitted' | 'approved' | 'rejected';
  creator_handle?: string;
  likes_count?: number;
  platform?: string;
  earnings?: number;
  trend_umbrella?: {
    name: string;
  };
}

export default function SubmissionHistory() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [approvalRate, setApprovalRate] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchSubmissions();
    }
  }, [user?.id, filter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('trend_submissions')
        .select(`
          *,
          trend_umbrella:trend_umbrella_id (
            name
          )
        `)
        .eq('spotter_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter === 'approved') {
        query = query.eq('status', 'approved');
      } else if (filter === 'pending') {
        query = query.eq('status', 'submitted');
      }

      const { data, error } = await query;

      if (error) throw error;

      setSubmissions(data || []);
      
      // Calculate stats
      const approved = (data || []).filter(s => s.status === 'approved');
      const total = (data || []).length;
      const earnings = approved.reduce((sum, s) => sum + (s.earnings || EARNINGS_STANDARD.BASE_RATES.TREND_SUBMISSION), 0);
      
      setTotalEarnings(earnings);
      setApprovalRate(total > 0 ? (approved.length / total) * 100 : 0);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckIcon className="w-4 h-4 text-green-400" />;
      case 'rejected':
        return <XIcon className="w-4 h-4 text-red-400" />;
      default:
        return <ClockIcon className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-400';
      case 'rejected':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-yellow-500/10 text-yellow-400';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="wave-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-wave-400 text-sm">Total Earnings</p>
              <p className="text-2xl font-bold text-white">{formatEarnings(totalEarnings)}</p>
            </div>
            <DollarSignIcon className="w-8 h-8 text-green-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="wave-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-wave-400 text-sm">Submissions</p>
              <p className="text-2xl font-bold text-white">{submissions.length}</p>
            </div>
            <TrendingUpIcon className="w-8 h-8 text-wave-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="wave-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-wave-400 text-sm">Approval Rate</p>
              <p className="text-2xl font-bold text-white">{approvalRate.toFixed(0)}%</p>
            </div>
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-wave-700"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${(approvalRate / 100) * 125.6} 125.6`}
                  className="text-wave-400"
                />
              </svg>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'approved', 'pending'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === tab
                ? 'bg-wave-600 text-white'
                : 'bg-wave-800/50 text-wave-400 hover:bg-wave-700/50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <SimpleLoader />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-wave-400">No submissions found</p>
          </div>
        ) : (
          submissions.map((submission) => (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="wave-card p-4"
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                {submission.screenshot_url ? (
                  <img
                    src={submission.screenshot_url}
                    alt="Trend screenshot"
                    className="w-16 h-16 rounded-lg object-cover bg-wave-800"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-wave-800/50 flex items-center justify-center">
                    {submission.post_url ? (
                      <LinkIcon className="w-6 h-6 text-wave-600" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-wave-600" />
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-white truncate">
                        {submission.trend_umbrella?.name || 
                         submission.description.split('\n')[0] || 
                         'Untitled Trend'}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-wave-400">
                        {submission.platform && (
                          <span className="capitalize">{submission.platform}</span>
                        )}
                        {submission.creator_handle && (
                          <span>{submission.creator_handle}</span>
                        )}
                        {submission.likes_count && (
                          <span>❤️ {submission.likes_count.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Status & Earnings */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(submission.status)}`}>
                        {getStatusIcon(submission.status)}
                        {submission.status}
                      </span>
                      {submission.status === 'approved' && (
                        <span className="text-green-400 font-medium">
                          +{formatEarnings(submission.earnings || EARNINGS_STANDARD.BASE_RATES.TREND_SUBMISSION)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-wave-500 mt-2">
                    {formatDate(submission.created_at)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}