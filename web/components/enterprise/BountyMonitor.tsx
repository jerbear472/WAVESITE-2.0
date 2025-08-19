'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Download, 
  Pause, 
  Play, 
  X, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface BountySubmission {
  id: string;
  headline: string;
  description: string;
  link: string;
  screenshot_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'duplicate';
  submitted_at: string;
  spotter_id: string;
  spotter?: {
    username: string;
    avatar_url?: string;
    expertise?: string[];
  };
}

interface BountyStats {
  total_submissions: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  total_cost: number;
  avg_time_to_submit: number;
  top_spotters: Array<{
    id: string;
    username: string;
    submissions: number;
    approved: number;
  }>;
}

export function BountyMonitor({ 
  bountyId, 
  onClose 
}: { 
  bountyId: string; 
  onClose: () => void;
}) {
  const supabase = createClientComponentClient();
  const [bounty, setBounty] = useState<any>(null);
  const [submissions, setSubmissions] = useState<BountySubmission[]>([]);
  const [stats, setStats] = useState<BountyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<BountySubmission | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchBountyData();
    
    if (autoRefresh && !isPaused) {
      const interval = setInterval(fetchBountyData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [bountyId, autoRefresh, isPaused]);

  useEffect(() => {
    // Set up real-time subscription
    const channel = supabase
      .channel(`bounty-${bountyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bounty_submissions',
          filter: `bounty_id=eq.${bountyId}`
        },
        (payload) => {
          // Add new submission to the list with animation
          handleNewSubmission(payload.new as BountySubmission);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bounty_submissions',
          filter: `bounty_id=eq.${bountyId}`
        },
        (payload) => {
          // Update existing submission
          handleSubmissionUpdate(payload.new as BountySubmission);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bountyId]);

  const fetchBountyData = async () => {
    try {
      // Fetch bounty details
      const { data: bountyData, error: bountyError } = await supabase
        .from('bounties')
        .select('*')
        .eq('id', bountyId)
        .single();

      if (bountyError) throw bountyError;
      setBounty(bountyData);

      // Fetch submissions with spotter info
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('bounty_submissions')
        .select(`
          *,
          spotter:profiles(username, avatar_url, expertise)
        `)
        .eq('bounty_id', bountyId)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);

      // Calculate stats
      calculateStats(submissionsData || []);
    } catch (error) {
      console.error('Error fetching bounty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (submissions: BountySubmission[]) => {
    const approved = submissions.filter(s => s.status === 'approved');
    const pending = submissions.filter(s => s.status === 'pending');
    const rejected = submissions.filter(s => s.status === 'rejected');

    // Calculate average time to submit
    const submissionTimes = submissions.map(s => 
      new Date(s.submitted_at).getTime() - new Date(bounty?.created_at).getTime()
    );
    const avgTime = submissionTimes.length > 0 
      ? submissionTimes.reduce((a, b) => a + b, 0) / submissionTimes.length 
      : 0;

    // Get top spotters
    const spotterMap = new Map();
    submissions.forEach(s => {
      if (!spotterMap.has(s.spotter_id)) {
        spotterMap.set(s.spotter_id, {
          id: s.spotter_id,
          username: s.spotter?.username || 'Unknown',
          submissions: 0,
          approved: 0
        });
      }
      const spotter = spotterMap.get(s.spotter_id);
      spotter.submissions++;
      if (s.status === 'approved') spotter.approved++;
    });
    const topSpotters = Array.from(spotterMap.values())
      .sort((a, b) => b.approved - a.approved)
      .slice(0, 5);

    setStats({
      total_submissions: submissions.length,
      approved_count: approved.length,
      pending_count: pending.length,
      rejected_count: rejected.length,
      total_cost: approved.length * (bounty?.price_per_spot || 0),
      avg_time_to_submit: avgTime,
      top_spotters: topSpotters
    });
  };

  const handleNewSubmission = (submission: BountySubmission) => {
    setSubmissions(prev => [submission, ...prev]);
    // Show notification
    showNotification(`New submission: ${submission.headline}`);
  };

  const handleSubmissionUpdate = (submission: BountySubmission) => {
    setSubmissions(prev => 
      prev.map(s => s.id === submission.id ? submission : s)
    );
  };

  const showNotification = (message: string) => {
    // You could integrate with a toast library here
    console.log('Notification:', message);
  };

  const updateSubmissionStatus = async (
    submissionId: string, 
    status: 'approved' | 'rejected'
  ) => {
    try {
      const { error } = await supabase
        .from('bounty_submissions')
        .update({ 
          status, 
          validated_at: new Date().toISOString() 
        })
        .eq('id', submissionId);

      if (error) throw error;

      // Update local state
      setSubmissions(prev =>
        prev.map(s => s.id === submissionId ? { ...s, status } : s)
      );
    } catch (error) {
      console.error('Error updating submission:', error);
    }
  };

  const pauseBounty = async () => {
    try {
      const newStatus = isPaused ? 'active' : 'paused';
      const { error } = await supabase
        .from('bounties')
        .update({ status: newStatus })
        .eq('id', bountyId);

      if (error) throw error;
      setIsPaused(!isPaused);
    } catch (error) {
      console.error('Error pausing bounty:', error);
    }
  };

  const exportToCSV = () => {
    const csvData = submissions.map(s => ({
      Headline: s.headline,
      Description: s.description,
      Link: s.link,
      Status: s.status,
      Spotter: s.spotter?.username || 'Unknown',
      'Submitted At': format(new Date(s.submitted_at), 'yyyy-MM-dd HH:mm:ss')
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bounty-${bountyId}-${Date.now()}.csv`;
    a.click();
  };

  const filteredSubmissions = submissions.filter(s => {
    if (filterStatus === 'all') return true;
    return s.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gray-900 rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="text-white mt-4">Loading bounty data...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">BOUNTY PROGRESS - LIVE</h2>
              <p className="text-gray-400">{bounty?.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Control Bar */}
          <div className="flex items-center gap-4">
            <button
              onClick={pauseBounty}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isPaused 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
              }`}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              <RefreshCw size={16} className={autoRefresh ? 'animate-spin' : ''} />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-4 p-6 border-b border-gray-800">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats?.total_submissions || 0}</div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{stats?.approved_count || 0}</div>
            <div className="text-sm text-gray-400">Approved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats?.pending_count || 0}</div>
            <div className="text-sm text-gray-400">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{stats?.rejected_count || 0}</div>
            <div className="text-sm text-gray-400">Rejected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">
              ${stats?.total_cost.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-gray-400">Total Cost</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 px-6 pt-4">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                filterStatus === status
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            <AnimatePresence>
              {filteredSubmissions.map((submission) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-cyan-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs text-gray-500">
                          {format(new Date(submission.submitted_at), 'HH:mm:ss')}
                        </span>
                        {submission.status === 'pending' && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                            PENDING REVIEW
                          </span>
                        )}
                        {submission.status === 'approved' && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                            ✓ APPROVED
                          </span>
                        )}
                        {submission.status === 'rejected' && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                            ✗ REJECTED
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-white font-medium mb-1">{submission.headline}</h4>
                      
                      {submission.description && (
                        <p className="text-gray-400 text-sm mb-2">{submission.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4">
                        <a
                          href={submission.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm"
                        >
                          <ExternalLink size={14} />
                          View Source
                        </a>
                        
                        {submission.spotter && (
                          <span className="text-sm text-gray-500">
                            by @{submission.spotter.username}
                          </span>
                        )}
                      </div>
                    </div>

                    {submission.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateSubmissionStatus(submission.id, 'approved')}
                          className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          onClick={() => updateSubmissionStatus(submission.id, 'rejected')}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Top Spotters Sidebar */}
        {stats && stats.top_spotters.length > 0 && (
          <div className="border-t border-gray-800 p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">TOP CONTRIBUTORS</h3>
            <div className="flex gap-4">
              {stats.top_spotters.map((spotter, index) => (
                <div key={spotter.id} className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">#{index + 1}</span>
                  <span className="text-white">@{spotter.username}</span>
                  <span className="text-gray-500 text-sm">
                    {spotter.approved}/{spotter.submissions}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}