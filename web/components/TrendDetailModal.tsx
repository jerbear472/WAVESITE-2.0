'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X as XIcon,
  TrendingUp as TrendingUpIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Share2 as ShareIcon,
  DollarSign as DollarSignIcon,
  Calendar as CalendarIcon,
  ExternalLink as ExternalLinkIcon,
  User as UserIcon,
  Zap as ZapIcon,
  Activity as ActivityIcon,
  Award as AwardIcon,
  BarChart2 as BarChartIcon,
  Clock as ClockIcon,
  TrendingDown as TrendingDownIcon,
  ChevronRight as ChevronRightIcon,
  Play as PlayIcon,
  Download as DownloadIcon,
  Copy as CopyIcon,
  CheckCircle as CheckCircleIcon,
  AlertCircle as AlertCircleIcon,
  Info as InfoIcon,
  Target as TargetIcon,
  Sparkles as SparklesIcon,
  Hash as HashIcon,
  Globe as GlobeIcon,
  Shield as ShieldIcon,
  Flag as FlagIcon,
  ThumbsUp as ThumbsUpIcon,
  ThumbsDown as ThumbsDownIcon
} from 'lucide-react'

interface TrendDetailModalProps {
  trend: any
  isOpen: boolean
  onClose: () => void
  onValidate?: (trendId: string, vote: 'approve' | 'reject') => void
  onShare?: (trendId: string) => void
  onFlag?: (trendId: string, reason: string) => void
}

export default function TrendDetailModal({ 
  trend, 
  isOpen, 
  onClose,
  onValidate,
  onShare,
  onFlag 
}: TrendDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'engagement' | 'earnings'>('overview')
  const [copied, setCopied] = useState(false)
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [userVote, setUserVote] = useState<'approve' | 'reject' | null>(null)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatEngagement = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const handleCopyLink = () => {
    if (trend.post_url) {
      navigator.clipboard.writeText(trend.post_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleVote = (vote: 'approve' | 'reject') => {
    setUserVote(vote)
    if (onValidate) {
      onValidate(trend.id, vote)
    }
  }

  const getVelocityInfo = () => {
    const velocity = trend.trend_velocity || 'just_starting'
    const config = {
      'just_starting': { 
        text: 'Just Starting', 
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        description: 'This trend is in its early stages with potential for growth'
      },
      'picking_up': { 
        text: 'Picking Up', 
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        description: 'Gaining momentum and showing strong engagement signals'
      },
      'viral': { 
        text: 'Going Viral', 
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        description: 'Experiencing explosive growth across multiple platforms'
      },
      'peaked': { 
        text: 'At Peak', 
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        description: 'Has reached maximum visibility and engagement'
      },
      'declining': { 
        text: 'Declining', 
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        description: 'Past its peak but may still have residual value'
      }
    }
    return config[velocity as keyof typeof config] || config['just_starting']
  }

  const velocityInfo = getVelocityInfo()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[90%] md:max-w-6xl bg-gray-900 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="relative h-64 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
              {/* Background Image */}
              {(trend.thumbnail_url || trend.screenshot_url) && (
                <>
                  <img 
                    src={trend.thumbnail_url || trend.screenshot_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                </>
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors"
              >
                <XIcon className="w-6 h-6 text-white" />
              </button>

              {/* Title and basic info */}
              <div className="absolute bottom-6 left-6 right-6">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {trend.evidence?.title || trend.description.split('\n')[0]}
                </h2>
                <div className="flex items-center gap-4 text-white/80">
                  {trend.creator_handle && (
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      <span>{trend.creator_handle}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{formatDate(trend.created_at)}</span>
                  </div>
                  <div className={`px-3 py-1 rounded-full ${velocityInfo.bgColor} ${velocityInfo.color} text-sm font-bold`}>
                    {velocityInfo.text}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation tabs */}
            <div className="flex items-center gap-1 p-2 bg-gray-800/50 border-b border-gray-800">
              {(['overview', 'analytics', 'engagement', 'earnings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab 
                      ? 'bg-white/10 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <EyeIcon className="w-5 h-5 text-purple-400" />
                        <span className="text-xs text-gray-400">Total Views</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {formatEngagement(trend.views_count || 0)}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <HeartIcon className="w-5 h-5 text-red-400" />
                        <span className="text-xs text-gray-400">Total Likes</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {formatEngagement(trend.likes_count || 0)}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <ShareIcon className="w-5 h-5 text-green-400" />
                        <span className="text-xs text-gray-400">Total Shares</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {formatEngagement(trend.shares_count || 0)}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <SparklesIcon className="w-5 h-5 text-blue-400" />
                        <span className="text-xs text-gray-400">Wave Score</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {trend.wave_score || 5}/10
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {trend.description && (
                    <div className="bg-gray-800/50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                      <p className="text-gray-300 whitespace-pre-wrap">{trend.description}</p>
                    </div>
                  )}

                  {/* Caption */}
                  {trend.post_caption && (
                    <div className="bg-gray-800/50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Original Caption</h3>
                      <p className="text-gray-300 italic">"{trend.post_caption}"</p>
                    </div>
                  )}

                  {/* Hashtags */}
                  {trend.hashtags && trend.hashtags.length > 0 && (
                    <div className="bg-gray-800/50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Hashtags</h3>
                      <div className="flex flex-wrap gap-2">
                        {trend.hashtags.map((tag: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Velocity Analysis */}
                  <div className="bg-gray-800/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Velocity Analysis</h3>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${velocityInfo.bgColor}`}>
                        <ZapIcon className={`w-8 h-8 ${velocityInfo.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-xl font-bold ${velocityInfo.color} mb-2`}>
                          {velocityInfo.text}
                        </p>
                        <p className="text-gray-400">{velocityInfo.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4">
                    {trend.post_url && (
                      <>
                        <a
                          href={trend.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                        >
                          <ExternalLinkIcon className="w-5 h-5" />
                          View Original
                        </a>
                        <button
                          onClick={handleCopyLink}
                          className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
                        >
                          {copied ? <CheckCircleIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                          {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                      </>
                    )}
                    {onShare && (
                      <button
                        onClick={() => onShare(trend.id)}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
                      >
                        <ShareIcon className="w-5 h-5" />
                        Share
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  {/* Performance Metrics */}
                  <div className="bg-gray-800/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-white">{((trend.likes_count || 0) / (trend.views_count || 1) * 100).toFixed(1)}%</p>
                        <p className="text-sm text-gray-400 mt-1">Like Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-white">{((trend.shares_count || 0) / (trend.views_count || 1) * 100).toFixed(1)}%</p>
                        <p className="text-sm text-gray-400 mt-1">Share Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-white">{((trend.comments_count || 0) / (trend.views_count || 1) * 100).toFixed(1)}%</p>
                        <p className="text-sm text-gray-400 mt-1">Comment Rate</p>
                      </div>
                    </div>
                  </div>

                  {/* Trend Velocity */}
                  <div className="bg-gray-800/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Trend Velocity Analysis</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Current Stage</span>
                        <span className={`font-bold ${velocityInfo.color}`}>{velocityInfo.text}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Wave Score</span>
                        <span className="font-bold text-white">{trend.wave_score || 5}/10</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Virality Prediction</span>
                        <span className="font-bold text-white">{(trend.virality_prediction || 0.5) * 100}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Quality Score</span>
                        <span className="font-bold text-white">{trend.quality_score || 0}/10</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Engagement Tab */}
              {activeTab === 'engagement' && (
                <div className="space-y-6">
                  {/* Validation Section */}
                  <div className="bg-gray-800/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Community Validation</h3>
                    
                    {/* Validation Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <ThumbsUpIcon className="w-6 h-6 text-green-400" />
                          <span className="text-sm text-gray-400">Approvals</span>
                        </div>
                        <p className="text-3xl font-bold text-green-400">{trend.approve_count || 0}</p>
                        <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500"
                            style={{ width: `${((trend.approve_count || 0) / ((trend.approve_count || 0) + (trend.reject_count || 0)) * 100) || 0}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <ThumbsDownIcon className="w-6 h-6 text-red-400" />
                          <span className="text-sm text-gray-400">Rejections</span>
                        </div>
                        <p className="text-3xl font-bold text-red-400">{trend.reject_count || 0}</p>
                        <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500"
                            style={{ width: `${((trend.reject_count || 0) / ((trend.approve_count || 0) + (trend.reject_count || 0)) * 100) || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vote Buttons */}
                    {onValidate && !userVote && (
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleVote('approve')}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
                        >
                          <ThumbsUpIcon className="w-5 h-5" />
                          Approve Trend
                        </button>
                        <button
                          onClick={() => handleVote('reject')}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                        >
                          <ThumbsDownIcon className="w-5 h-5" />
                          Reject Trend
                        </button>
                      </div>
                    )}

                    {userVote && (
                      <div className={`text-center py-4 px-6 rounded-xl ${
                        userVote === 'approve' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                      }`}>
                        <p className={`text-lg font-medium ${userVote === 'approve' ? 'text-green-400' : 'text-red-400'}`}>
                          You {userVote === 'approve' ? 'approved' : 'rejected'} this trend
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Social Proof */}
                  <div className="bg-gray-800/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Social Proof</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-gray-700">
                        <div className="flex items-center gap-3">
                          <HeartIcon className="w-5 h-5 text-red-400" />
                          <span className="text-gray-300">Like to View Ratio</span>
                        </div>
                        <span className="text-white font-medium">
                          {((trend.likes_count || 0) / (trend.views_count || 1) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-gray-700">
                        <div className="flex items-center gap-3">
                          <MessageCircleIcon className="w-5 h-5 text-blue-400" />
                          <span className="text-gray-300">Comment Engagement</span>
                        </div>
                        <span className="text-white font-medium">
                          {formatEngagement(trend.comments_count || 0)} comments
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <ShareIcon className="w-5 h-5 text-green-400" />
                          <span className="text-gray-300">Viral Coefficient</span>
                        </div>
                        <span className="text-white font-medium">
                          {((trend.shares_count || 0) / (trend.views_count || 1) * 100).toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Earnings Tab */}
              {activeTab === 'earnings' && (
                <div className="space-y-6">
                  {/* Current Earnings */}
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Current Earnings</h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        trend.bounty_paid 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {trend.bounty_paid ? 'Paid' : 'Pending'}
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-bold text-white">
                        {formatCurrency(trend.bounty_amount || 0)}
                      </p>
                      {!trend.bounty_paid && (
                        <p className="text-sm text-gray-400 mb-1">awaiting validation</p>
                      )}
                    </div>
                  </div>

                  {/* Earnings Breakdown */}
                  <div className="bg-gray-800/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Earnings Breakdown</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-400">Base Submission</span>
                        <span className="text-white font-medium">$0.25</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-400">Quality Bonus</span>
                        <span className="text-white font-medium">
                          ${((trend.quality_score || 0) * 0.1).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-400">Virality Bonus</span>
                        <span className="text-white font-medium">
                          ${((trend.virality_prediction || 0) * 10).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 pt-4 border-t border-gray-700">
                        <span className="text-white font-semibold">Total</span>
                        <span className="text-white font-semibold">
                          {formatCurrency(trend.bounty_amount || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Potential Earnings */}
                  <div className="bg-gray-800/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Potential Earnings</h3>
                    <p className="text-gray-400 mb-4">
                      Based on current trajectory, this trend could earn:
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-400">
                          {formatCurrency((trend.bounty_amount || 0) * 1.5)}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">If Approved</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-400">
                          {formatCurrency((trend.bounty_amount || 0) * 3)}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">If Trending</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-400">
                          {formatCurrency((trend.bounty_amount || 0) * 10)}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">If Viral</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between p-6 bg-gray-800/50 border-t border-gray-800">
              <button
                onClick={() => setShowFlagModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <FlagIcon className="w-4 h-4" />
                Report Issue
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}