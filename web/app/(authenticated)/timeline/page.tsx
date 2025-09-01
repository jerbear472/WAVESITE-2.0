'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useNavigationRefresh } from '@/hooks/useNavigationRefresh';
import { supabaseCache } from '@/lib/supabaseCache';
import { motion, AnimatePresence } from 'framer-motion';
import SmartTrendSubmission from '@/components/SmartTrendSubmission';
import { TrendSubmissionService } from '@/services/TrendSubmissionService';
import { FallbackSubmission } from '@/services/FallbackSubmission';
import { submitTrend } from '@/lib/submitTrend';
import SimpleVoteDisplay from '@/components/SimpleVoteDisplay';
import { useToast } from '@/contexts/ToastContext';
import { fetchUserTrends as fetchUserTrendsHelper } from '@/hooks/useAuthenticatedSupabase';
import { useXPNotification } from '@/contexts/XPNotificationContext';
import { WAVESIGHT_MESSAGES } from '@/lib/trendNotifications';
import { cleanTrendData } from '@/lib/cleanTrendData';
// Removed formatCurrency import - using XP display instead
import { 
  TrendingUp as TrendingUpIcon,
  Clock as ClockIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Share2 as ShareIcon,
  DollarSign as DollarSignIcon,
  Hash as HashIcon,
  Calendar as CalendarIcon,
  Filter as FilterIcon,
  Grid as GridIcon,
  List as ListIcon,
  Plus as PlusIcon,
  RefreshCw as RefreshIcon,
  Sparkles as SparklesIcon,
  BarChart as BarChartIcon,
  Award as AwardIcon,
  ExternalLink as ExternalLinkIcon,
  User as UserIcon,
  Users as UsersIcon,
  Zap as ZapIcon
} from 'lucide-react';

interface Trend {
  id: string;
  spotter_id: string;
  category: string;
  description: string;
  screenshot_url?: string;
  evidence?: any;
  virality_prediction?: number;
  predicted_peak_date?: string;
  status: 'pending' | 'approved' | 'rejected';
  quality_score: number;
  validation_count: number;
  xp_amount: number;
  xp_awarded: boolean;
  created_at: string;
  validated_at?: string;
  mainstream_at?: string;
  // Enhanced fields
  stage?: 'submitted' | 'trending' | 'viral' | 'peaked' | 'declining' | 'auto_rejected';
  trend_momentum_score?: number;
  positive_validations?: number;
  negative_validations?: number;
  // New validation system fields
  approve_count?: number;
  reject_count?: number;
  validation_status?: 'pending' | 'approved' | 'rejected';
  // New voting system from predictions page
  wave_votes?: number;
  fire_votes?: number;
  declining_votes?: number;
  dead_votes?: number;
  is_validated?: boolean;
  is_rejected?: boolean;
  // Social media metadata
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  hashtags?: string[];
  post_url?: string;
  thumbnail_url?: string;
  posted_at?: string;
  wave_score?: number;
  trend_velocity?: 'just_starting' | 'picking_up' | 'viral' | 'saturated' | 'peaked' | 'declining';
  trend_size?: 'micro' | 'niche' | 'viral' | 'mega' | 'global';
  sentiment?: number;
  // Origins and demographics fields
  driving_generation?: string;
  trend_origin?: string;
  evolution_status?: string;
  // Optional trending explanation
  why_trending?: string;
}

// Add new types for filtering and sorting
type FilterOption = 'all' | 'approved' | 'rejected';
type SortOption = 'newest' | 'oldest' | 'engagement';
type ViewMode = 'grid' | 'list' | 'timeline';

export default function Timeline() {
  const { user, loading: authLoading } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const { showXPNotification } = useXPNotification();
  // Removed earnings toast - using XP system now
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const router = useRouter();

  // Enhanced trend detail modal component with all metadata and AI analysis
  const TrendDetailModal = ({ trend, onClose }: { trend: Trend, onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header with thumbnail */}
        <div className="relative">
          {/* Thumbnail Background */}
          {(trend.screenshot_url || trend.thumbnail_url) && (
            <div className="relative h-48 bg-gray-100 overflow-hidden">
              <img 
                src={trend.screenshot_url || trend.thumbnail_url} 
                alt="Trend visual"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          )}
          
          {/* Header Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">
                  {trend.evidence?.title || (trend.description && trend.description !== '0' ? trend.description : null) || 'Trend Analysis'}
                </h2>
                <div className="flex items-center gap-2 text-sm opacity-90">
                  <span>{getCategoryEmoji(trend.category)} {getCategoryLabel(trend.category)}</span>
                  <span>•</span>
                  <span className="capitalize">{trend.status}</span>
                  {trend.stage && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{trend.stage}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Header for trends without thumbnails */}
          {!(trend.screenshot_url || trend.thumbnail_url) && (
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">
                    {trend.evidence?.title || (trend.description && trend.description !== '0' ? trend.description : null) || 'Trend Analysis'}
                  </h2>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <span>{getCategoryEmoji(trend.category)} {getCategoryLabel(trend.category)}</span>
                    <span>•</span>
                    <span className="capitalize">{trend.status}</span>
                    {trend.stage && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{trend.stage}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* AI Analysis */}
              {trend.evidence?.ai_description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-blue-500" />
                    AI Cultural Analysis
                  </h3>
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-gray-700 leading-relaxed">{trend.evidence.ai_description}</p>
                  </div>
                </div>
              )}

              {/* Origins & Evolution */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Trend Origins
                </h4>
                <div className="space-y-2 text-sm">
                  {/* These fields would come from the new submission form */}
                  {trend.evidence?.driving_generation && (
                    <div>
                      <span className="text-gray-600">Driving Generation: </span>
                      <span className="font-medium text-gray-800">
                        {trend.evidence.driving_generation === 'gen_alpha' ? '📱 Gen Alpha (9-14)' :
                         trend.evidence.driving_generation === 'gen_z' ? '🎮 Gen Z (15-24)' :
                         trend.evidence.driving_generation === 'millennials' ? '💻 Millennials (25-40)' :
                         trend.evidence.driving_generation === 'gen_x' ? '💿 Gen X (40-55)' :
                         trend.evidence.driving_generation === 'boomers' ? '📺 Boomers (55+)' : trend.evidence.driving_generation}
                      </span>
                    </div>
                  )}
                  {trend.evidence?.trend_origin && (
                    <div>
                      <span className="text-gray-600">Origin: </span>
                      <span className="font-medium text-gray-800">
                        {trend.evidence.trend_origin === 'organic' ? '🌱 Organic/User generated' :
                         trend.evidence.trend_origin === 'influencer' ? '⭐ Influencer/Creator pushed' :
                         trend.evidence.trend_origin === 'brand' ? '💼 Brand/Marketing campaign' :
                         trend.evidence.trend_origin === 'ai_generated' ? '🤖 AI/Bot generated' : trend.evidence.trend_origin}
                      </span>
                    </div>
                  )}
                  {trend.evidence?.evolution_status && (
                    <div>
                      <span className="text-gray-600">Evolution: </span>
                      <span className="font-medium text-gray-800">
                        {trend.evidence.evolution_status === 'original' ? '🧬 Original' :
                         trend.evidence.evolution_status === 'variants' ? '🔄 Variants emerging' :
                         trend.evidence.evolution_status === 'parody' ? '😂 Parody phase' :
                         trend.evidence.evolution_status === 'meta' ? '🤯 Meta evolution' :
                         trend.evidence.evolution_status === 'final' ? '🧟 Final form' : trend.evidence.evolution_status}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Creator Information */}
              {(trend.creator_handle || trend.creator_name) && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <h4 className="text-md font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    Creator Info
                  </h4>
                  <div className="space-y-2 text-sm">
                    {trend.creator_handle && (
                      <div>
                        <span className="text-purple-600">Handle: </span>
                        <span className="font-medium text-purple-800">@{trend.creator_handle}</span>
                      </div>
                    )}
                    {trend.creator_name && (
                      <div>
                        <span className="text-purple-600">Name: </span>
                        <span className="font-medium text-purple-800">{trend.creator_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Origins & Demographics */}
              {(trend.driving_generation || trend.trend_origin || trend.evolution_status) && (
                <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
                  <h4 className="text-md font-semibold text-cyan-800 mb-3 flex items-center gap-2">
                    <UsersIcon className="w-4 h-4" />
                    Origins & Demographics
                  </h4>
                  <div className="space-y-2 text-sm">
                    {trend.driving_generation && (
                      <div>
                        <span className="text-cyan-600">Driving Generation: </span>
                        <span className="font-medium text-cyan-800">
                          {trend.driving_generation === 'gen_alpha' ? '📱 Gen Alpha (9-14)' :
                           trend.driving_generation === 'gen_z' ? '🎮 Gen Z (15-24)' :
                           trend.driving_generation === 'millennials' ? '💻 Millennials (25-40)' :
                           trend.driving_generation === 'gen_x' ? '💿 Gen X (40-55)' :
                           trend.driving_generation === 'boomers' ? '📺 Boomers (55+)' : trend.driving_generation}
                        </span>
                      </div>
                    )}
                    {trend.trend_origin && (
                      <div>
                        <span className="text-cyan-600">Origin: </span>
                        <span className="font-medium text-cyan-800">
                          {trend.trend_origin === 'organic' ? '🌱 Organic/User generated' :
                           trend.trend_origin === 'influencer' ? '🎭 Influencer/Creator pushed' :
                           trend.trend_origin === 'brand' ? '🏢 Brand/Marketing campaign' :
                           trend.trend_origin === 'ai_generated' ? '🤖 AI/Bot generated' : trend.trend_origin}
                        </span>
                      </div>
                    )}
                    {trend.evolution_status && (
                      <div>
                        <span className="text-cyan-600">Evolution: </span>
                        <span className="font-medium text-cyan-800">
                          {trend.evolution_status === 'original' ? '🧬 Original' :
                           trend.evolution_status === 'variants' ? '🔄 Variants emerging' :
                           trend.evolution_status === 'parody' ? '😂 Parody phase' :
                           trend.evolution_status === 'meta' ? '🤯 Meta evolution' :
                           trend.evolution_status === 'final' ? '🧟 Final form' : trend.evolution_status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Original Description */}
              {trend.description && trend.description !== '0' && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Spotter Description</h4>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4 text-sm">{trend.description}</p>
                </div>
              )}

              {/* Why is this trending? */}
              {trend.why_trending && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">💡</span>
                    Why is this trending?
                  </h4>
                  <p className="text-gray-700 leading-relaxed bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 text-sm border border-yellow-200">
                    {trend.why_trending}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                {(trend.wave_score ?? 0) > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-blue-600 font-medium">Wave Score</div>
                    <div className="text-lg font-bold text-blue-700">{Math.round((trend.wave_score ?? 0) * 10)}/100</div>
                  </div>
                )}
                {trend.sentiment !== undefined && trend.sentiment !== null && (
                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                    <div className="text-xs text-indigo-600 font-medium">Sentiment Score</div>
                    <div className="text-lg font-bold text-indigo-700">{trend.sentiment}/100</div>
                  </div>
                )}
                {trend.quality_score && trend.quality_score > 0 && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="text-xs text-green-600 font-medium">Quality Score</div>
                    <div className="text-lg font-bold text-green-700">{trend.quality_score}/10</div>
                  </div>
                )}
                {trend.virality_prediction && trend.virality_prediction > 0 && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <div className="text-xs text-purple-600 font-medium">Virality</div>
                    <div className="text-lg font-bold text-purple-700">{Math.round(trend.virality_prediction * 100)}%</div>
                  </div>
                )}
                {trend.xp_amount > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                    <div className="text-xs text-yellow-600 font-medium">XP Earned</div>
                    <div className="text-lg font-bold text-yellow-700">{trend.xp_amount}</div>
                  </div>
                )}
              </div>

              {/* Trend Velocity & Size */}
              {(trend.trend_velocity || trend.trend_size) && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <h4 className="text-md font-semibold text-orange-800 mb-3 flex items-center gap-2">
                    <TrendingUpIcon className="w-4 h-4" />
                    Trend Dynamics
                  </h4>
                  <div className="space-y-2">
                    {trend.trend_velocity && (
                      <div>
                        <span className="text-xs text-orange-600 font-medium">Velocity:</span>
                        <span className="ml-2 inline-block px-3 py-1 text-sm font-medium bg-orange-100 text-orange-800 rounded-full capitalize">
                          {trend.trend_velocity === 'just_starting' ? '🚶 Just Starting' :
                           trend.trend_velocity === 'picking_up' ? '🚴 Picking Up' :
                           trend.trend_velocity === 'viral' ? '🚀 Going Viral' :
                           trend.trend_velocity === 'saturated' ? '🌊 Saturated' :
                           trend.trend_velocity === 'declining' ? '📉 Declining' :
                           trend.trend_velocity.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                    {trend.trend_size && (
                      <div>
                        <span className="text-xs text-orange-600 font-medium">Expected Size:</span>
                        <span className="ml-2 inline-block px-3 py-1 text-sm font-medium bg-orange-100 text-orange-800 rounded-full capitalize">
                          {(() => {
                            switch(trend.trend_size) {
                              case 'micro': return '🔬 Micro (<10K)';
                              case 'niche': return '🎯 Niche (10K-100K)';
                              case 'viral': return '🔥 Viral (100K-1M)';
                              case 'mega': return '💥 Mega (1M-10M)';
                              case 'global': return '🌍 Global (10M+)';
                              default: return String(trend.trend_size).replace('_', ' ');
                            }
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Engagement Metrics */}
              {(trend.likes_count || trend.comments_count || trend.views_count || trend.shares_count) && (
                <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                  <h4 className="text-md font-semibold text-pink-800 mb-3 flex items-center gap-2">
                    <HeartIcon className="w-4 h-4" />
                    Engagement
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {(trend.likes_count ?? 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <HeartIcon className="w-4 h-4 text-pink-600" />
                        <span className="font-medium">{(trend.likes_count ?? 0).toLocaleString()}</span>
                      </div>
                    )}
                    {(trend.comments_count ?? 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <MessageCircleIcon className="w-4 h-4 text-pink-600" />
                        <span className="font-medium">{(trend.comments_count ?? 0).toLocaleString()}</span>
                      </div>
                    )}
                    {(trend.views_count ?? 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <EyeIcon className="w-4 h-4 text-pink-600" />
                        <span className="font-medium">{(trend.views_count ?? 0).toLocaleString()}</span>
                      </div>
                    )}
                    {(trend.shares_count ?? 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <ShareIcon className="w-4 h-4 text-pink-600" />
                        <span className="font-medium">{(trend.shares_count ?? 0).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {trend.hashtags && trend.hashtags.length > 0 && (
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                  <h4 className="text-md font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                    <HashIcon className="w-4 h-4" />
                    Hashtags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {trend.hashtags.slice(0, 8).map((tag, index) => (
                      <span key={index} className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                        #{tag}
                      </span>
                    ))}
                    {trend.hashtags.length > 8 && (
                      <span className="px-2 py-1 text-xs text-indigo-600">
                        +{trend.hashtags.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Validation Status - Updated for new voting system */}
              {(trend.is_validated || ((trend.wave_votes ?? 0) > 0) || ((trend.fire_votes ?? 0) > 0) || ((trend.declining_votes ?? 0) > 0) || ((trend.dead_votes ?? 0) > 0)) && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <AwardIcon className="w-4 h-4" />
                    Community Votes
                  </h4>
                  {trend.is_validated && (
                    <div className="mb-3 px-3 py-1.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-bold rounded-full inline-flex items-center gap-1">
                      <span>✓</span> VALIDATED BY COMMUNITY
                    </div>
                  )}
                  <div className="flex items-center gap-4 flex-wrap">
                    {(trend.wave_votes ?? 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🌊</span>
                        <span className="font-bold text-blue-600">{trend.wave_votes}</span>
                      </div>
                    )}
                    {(trend.fire_votes ?? 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🔥</span>
                        <span className="font-bold text-orange-600">{trend.fire_votes}</span>
                      </div>
                    )}
                    {(trend.declining_votes ?? 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📉</span>
                        <span className="font-bold text-yellow-600">{trend.declining_votes}</span>
                      </div>
                    )}
                    {(trend.dead_votes ?? 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">💀</span>
                        <span className="font-bold text-gray-600">{trend.dead_votes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
            {/* Original Link */}
            {(trend.evidence?.post_url || trend.post_url) && (
              <a 
                href={trend.evidence?.post_url || trend.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLinkIcon className="w-4 h-4" />
                View Original Post
              </a>
            )}

            {/* Dates */}
            <div className="text-xs text-gray-500 text-right">
              <p>Submitted: {new Date(trend.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              {trend.validated_at && (
                <p>Validated: {new Date(trend.validated_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  // Use navigation refresh hook to reload data on route changes
  useNavigationRefresh(() => {
    if (user && !authLoading) {
      supabaseCache.clearTable('trend_submissions');
      fetchUserTrends();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchUserTrends();
      
      // Set up real-time subscription for ALL trends, validations, and XP
      const subscription = supabase
        .channel('all-trends-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trend_submissions'
            // No filter - listen for all trends
          },
          (payload) => {
            console.log('Trend update:', payload);
            // Only refresh if it's a submitted or approved trend
            const newStatus = (payload.new as any)?.status;
            if (newStatus === 'submitted' || newStatus === 'approved') {
              fetchUserTrends();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trend_validations'
            // Note: Can't filter by trend owner, so we'll refresh all trends
          },
          (payload) => {
            console.log('Validation update:', payload);
            // Only refresh if it's for one of our trends
            if ((payload.new as any)?.trend_id || (payload.old as any)?.trend_id) {
              fetchUserTrends();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'xp_events',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('XP update:', payload);
            // Just refresh the XP total, not all trends
            fetchUserTrends(false);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, authLoading, router]);

  // Listen for XP events to refresh timeline XP display
  useEffect(() => {
    const handleXPEarned = () => {
      if (user) {
        // Just refresh the XP data, not all trends
        fetchUserTrends(false);
      }
    };

    window.addEventListener('xp-earned', handleXPEarned);
    return () => window.removeEventListener('xp-earned', handleXPEarned);
  }, [user]);

  const fetchUserTrends = async (showRefreshAnimation = false) => {
    try {
      if (showRefreshAnimation) setRefreshing(true);
      setError(null);
      setLoading(true);
      
      // Ensure we have the current user
      if (!user?.id) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          router.push('/login');
          return;
        }
      }

      const userId = user?.id || '';
      console.log('Timeline: Fetching all trends from all users');
      
      // Fetch ALL trends (not just user's own) with status 'submitted' or 'approved'
      // Similar to how predictions page fetches trends
      const { data, error } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          profiles:spotter_id (
            username
          )
        `)
        .in('status', ['submitted', 'approved'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        showError('Failed to load trends', (error as any).message || 'Unknown error');
        setError('Failed to load trends');
        
        // Log more details for debugging
        console.error('Trend fetch error details:', {
          error,
          userId,
          isAuthenticated: !!user,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      console.log('Timeline: Found trends:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('Timeline: Latest trend:', data[0]);
        console.log('Timeline: First trend thumbnail_url:', data[0].thumbnail_url);
        console.log('Timeline: First trend screenshot_url:', data[0].screenshot_url);
        console.log('Timeline: First trend post_url:', data[0].post_url);
        console.log('Timeline: First trend wave_score:', data[0].wave_score);
        // Debug: Check for any fields that might be "0"
        const firstTrend = data[0];
        Object.keys(firstTrend).forEach(key => {
          if (firstTrend[key] === "0" || firstTrend[key] === 0) {
            console.warn(`Timeline: Field "${key}" has value:`, firstTrend[key], 'type:', typeof firstTrend[key]);
          }
        });
      }
      
      // Clean and process trends to remove "0" values and set validation status
      const cleanedTrends = (data || []).map(trend => cleanTrendData(trend));
      const processedTrends = cleanedTrends.map(trend => ({
        ...trend,
        is_validated: (trend.wave_votes ?? 0) >= 3,
        is_rejected: (trend.dead_votes ?? 0) >= 3
      })).filter(trend => !trend.is_rejected); // Filter out rejected trends
      
      setTrends(processedTrends);

      // Fetch total XP from user_xp_summary view (same as Navigation)
      const { data: xpSummary, error: xpError } = await supabase
        .from('user_xp_summary')
        .select('total_xp')
        .eq('user_id', userId)
        .single();

      if (!xpError && xpSummary) {
        setTotalXP(Math.max(0, xpSummary.total_xp || 0)); // Never show negative XP
        console.log('Timeline: User total XP:', xpSummary.total_xp);
      } else {
        // Fallback: Try to get XP directly from user_xp table
        const { data: directXP } = await supabase
          .from('user_xp')
          .select('total_xp')
          .eq('user_id', userId)
          .single();
          
        if (directXP) {
          setTotalXP(Math.max(0, directXP.total_xp || 0));
          console.log('Timeline: User XP from fallback:', directXP.total_xp);
        } else {
          // Final fallback: sum from xp_events
          const { data: xpEvents } = await supabase
            .from('xp_events')
            .select('xp_change')
            .eq('user_id', userId);
            
          if (xpEvents) {
            const total = xpEvents.reduce((sum, xp) => sum + (xp.xp_change || 0), 0);
            setTotalXP(Math.max(0, total));
            console.log('Timeline: XP calculated from events:', total);
          }
        }
      }
    } catch (error: any) {
      showError('An unexpected error occurred', 'Please refresh the page');
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
      if (showRefreshAnimation) {
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  };

  // Filter and sort trends
  const getFilteredAndSortedTrends = () => {
    let filtered = trends;
    
    // Apply filter
    if (filter !== 'all') {
      filtered = trends.filter(trend => trend.status === filter);
    }
    
    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'engagement':
          const engagementA = (a.likes_count || 0) + (a.comments_count || 0) + (a.shares_count || 0);
          const engagementB = (b.likes_count || 0) + (b.comments_count || 0) + (b.shares_count || 0);
          return engagementB - engagementA;
        default:
          return 0;
      }
    });
    
    return sorted;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-US', options);
  };

  const formatEngagement = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'from-green-500 to-emerald-600';
      case 'rejected': return 'from-red-500 to-rose-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <SparklesIcon className="w-4 h-4" />;
      case 'rejected': return <ClockIcon className="w-4 h-4" />;
      default: return <TrendingUpIcon className="w-4 h-4" />;
    }
  };

  const getTrendVelocity = (trend: Trend) => {
    // Determine velocity based on stage, status, or other metrics
    if (trend.trend_velocity) return trend.trend_velocity;
    
    if (trend.stage === 'viral') return 'viral';
    if (trend.stage === 'declining') return 'declining';
    if (trend.stage === 'peaked') return 'saturated';
    if (trend.stage === 'trending' || (trend.wave_score && trend.wave_score >= 7)) return 'picking_up';
    if (trend.stage === 'submitted') return 'just_starting';
    
    // Fallback based on score
    const score = trend.wave_score || trend.virality_prediction || 5;
    if (score >= 8) return 'viral';
    if (score >= 6) return 'picking_up';
    return 'just_starting';
  };

  const getVelocityDisplay = (velocity: string) => {
    switch (velocity) {
      case 'just_starting': return { text: '🌱 Just Starting', color: 'text-green-600' };
      case 'picking_up': return { text: '📈 Picking Up', color: 'text-blue-600' };
      case 'viral': return { text: '🚀 Going Viral', color: 'text-red-600' };
      case 'saturated': return { text: '⚡ Saturated', color: 'text-purple-600' };
      case 'peaked': return { text: '⚡ Peaked', color: 'text-purple-600' }; // Backward compatibility
      case 'declining': return { text: '📉 Declining', color: 'text-orange-600' };
      default: return { text: '📊 Tracking', color: 'text-gray-600' };
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      'meme': '😂',
      'fashion': '👗',
      'food': '🍔',
      'music': '🎵',
      'lifestyle': '🏡',
      'tech': '🎮',
      'finance': '💰',
      'sports': '⚽',
      'political': '⚖️',
      'cars': '🚗',
      'animals': '🐾',
      'travel': '✈️',
      'education': '📚',
      'science': '🔬',
      'entertainment': '🎭',
      'art': '🎨',
      'relationships': '❤️',
      'health': '💊'
    };
    return emojiMap[category] || '📌';
  };

  const getCategoryLabel = (category: string) => {
    const labelMap: Record<string, string> = {
      'meme': 'Meme/Humor',
      'fashion': 'Fashion/Beauty',
      'food': 'Food/Drink',
      'music': 'Music/Dance',
      'lifestyle': 'Lifestyle',
      'tech': 'Tech/Gaming',
      'finance': 'Finance/Crypto',
      'sports': 'Sports/Fitness',
      'political': 'Political/Social',
      'cars': 'Cars & Machines',
      'animals': 'Animals & Pets',
      'travel': 'Travel & Places',
      'education': 'Education & Learning',
      'health': 'Health & Wellness',
      'product': 'Product/Shopping'
    };
    return labelMap[category] || category.replace(/_/g, ' ');
  };

  const getStageInfo = (stage: string) => {
    switch (stage) {
      case 'submitted':
        return { text: 'Just Starting', icon: '🌱', color: 'text-gray-600', bgColor: 'bg-gray-100' };
      case 'trending':
        return { text: 'Trending', icon: '🔥', color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'viral':
        return { text: 'Going Viral!', icon: '🚀', color: 'text-red-600', bgColor: 'bg-red-100' };
      case 'peaked':
        return { text: 'At Peak', icon: '⭐', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      case 'declining':
        return { text: 'Declining', icon: '📉', color: 'text-orange-600', bgColor: 'bg-orange-100' };
      case 'auto_rejected':
        return { text: 'Rejected', icon: '❌', color: 'text-gray-600', bgColor: 'bg-gray-100' };
      default:
        return { text: 'Unknown', icon: '❓', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const getCreatorProfileUrl = (platform: string, handle: string) => {
    // Clean the handle - remove @ if present
    const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
    
    switch(platform?.toLowerCase()) {
      case 'tiktok':
        return `https://www.tiktok.com/@${cleanHandle}`;
      case 'instagram':
        return `https://www.instagram.com/${cleanHandle}`;
      case 'youtube':
        return `https://www.youtube.com/@${cleanHandle}`;
      case 'twitter':
      case 'x':
        return `https://x.com/${cleanHandle}`;
      default:
        return '#';
    }
  };

  const handleTrendSubmit = async (trendData: any) => {
    console.log('Starting trend submission with data:', trendData);
    
    // Ensure user is authenticated
    if (!user?.id) {
      showError('Authentication Required', 'Please log in to submit trends');
      return;
    }

    try {
      // Add timeout to prevent hanging (15 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Submission timeout - please try again')), 15000)
      );
      
      // Use the proper submitTrend function with XP calculation
      console.log('📊 About to submit trend with data:', trendData);
      const result = await Promise.race([
        submitTrend(user.id, trendData),
        timeoutPromise
      ]) as any;
      
      console.log('📊 Submit result:', result);
      
      if (result && result.success) {
        // Close form and refresh trends
        setShowSubmitForm(false);
        await fetchUserTrends();
        
        // Show XP notification with calculated amount
        const xpEarned = result.earnings || 10;
        const xpBreakdown = result.xpBreakdown || [];
        
        console.log('🎯 Showing XP notification:', { xpEarned, xpBreakdown });
        showXPNotification(
          xpEarned, 
          `You earned ${xpEarned} XP`, 
          'submission',
          WAVESIGHT_MESSAGES.SUBMISSION_TITLE,
          xpBreakdown.length > 0 ? xpBreakdown.join(' • ') : WAVESIGHT_MESSAGES.VALIDATION_BONUS
        );
        console.log('✅ XP notification called');
        
        setError('');
        return result.data;
      } else {
        // Handle failure - try fallback if it's a service error
        if (result.error?.includes('temporarily unavailable') || 
            result.error?.includes('timeout')) {
          console.log('Main service failed, trying fallback...');
          showWarning('Using backup submission method', 'Some features may be limited');
          
          const fallbackResult = await FallbackSubmission.submit(trendData, user.id);
          
          if (fallbackResult.success) {
            setShowSubmitForm(false);
            await fetchUserTrends();
            // Show XP notification
            showXPNotification(
              10, 
              'You earned 10 XP', 
              'submission',
              WAVESIGHT_MESSAGES.SUBMISSION_TITLE,
              WAVESIGHT_MESSAGES.VALIDATION_BONUS
            );
            // XP will be awarded automatically
            setError('');
            return fallbackResult.data;
          } else {
            setError(fallbackResult.error || 'Both submission methods failed');
            showError('Submission failed completely', fallbackResult.error || 'Please try again later');
          }
        } else {
          // Non-recoverable error (like duplicate)
          setError(result.error || 'Failed to submit trend');
          showError('Submission failed', result.error || 'Please try again');
        }
      }
    } catch (error: any) {
      // If main service throws, try fallback
      console.error('Main service error:', error);
      
      // Check for timeout error first
      if (error.message?.includes('timeout')) {
        showError('Submission Timeout', 'The submission is taking too long. Please check your connection and try again.');
        return;
      }
      
      console.log('Attempting fallback submission...');
      
      try {
        const fallbackResult = await FallbackSubmission.submit(trendData, user.id);
        
        if (fallbackResult.success) {
          setShowSubmitForm(false);
          await fetchUserTrends();
          // Show XP notification
          showXPNotification(
            10, 
            'You earned 10 XP', 
            'submission',
            WAVESIGHT_MESSAGES.SUBMISSION_TITLE,
            WAVESIGHT_MESSAGES.VALIDATION_BONUS
          );
          // XP will be shown in UI automatically
          setError('');
          return fallbackResult.data;
        } else {
          throw new Error(fallbackResult.error || 'Fallback also failed');
        }
      } catch (fallbackError: any) {
        const errorMessage = fallbackError.message || 'All submission methods failed';
        setError(errorMessage);
        showError('Critical submission error', errorMessage);
      }
    }
  };

  if (authLoading || (loading && trends.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <TrendingUpIcon className="w-12 h-12 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  const filteredTrends = getFilteredAndSortedTrends();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Global Trend Timeline
                </h1>
                <p className="text-gray-600 mt-1">Discover all trends spotted by the WaveSight community</p>
              </div>
              
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fetchUserTrends(true)}
                  disabled={refreshing}
                  className="p-3 rounded-xl bg-white hover:bg-gray-50 backdrop-blur-md transition-all duration-300 border border-gray-200 shadow-sm"
                >
                  <RefreshIcon className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                </motion.button>
                
                <motion.a
                  href="/spot"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>New Trend</span>
                </motion.a>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur-md rounded-xl p-4 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Trends</span>
                  <TrendingUpIcon className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{trends.length}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/80 backdrop-blur-md rounded-xl p-4 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total XP</span>
                  <ZapIcon className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {totalXP.toLocaleString()} XP
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/80 backdrop-blur-md rounded-xl p-4 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Approved</span>
                  <SparklesIcon className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {trends.filter(t => t.status === 'approved').length}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/80 backdrop-blur-md rounded-xl p-4 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Approval Rate</span>
                  <AwardIcon className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {trends.length > 0 
                    ? `${Math.round((trends.filter(t => t.status === 'approved').length / trends.length) * 100)}%`
                    : '0%'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {trends.length > 0 
                    ? `${trends.filter(t => t.status === 'approved').length} of ${trends.length}`
                    : 'No trends'}
                </p>
              </motion.div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* View Mode Selector */}
                <div className="flex bg-white/80 backdrop-blur-md rounded-lg p-1 border border-gray-200 shadow-sm">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'grid' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <GridIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'list' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ListIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'timeline' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-all text-gray-700"
                >
                  <FilterIcon className="w-4 h-4" />
                  <span className="text-sm">Filters</span>
                  {filter !== 'all' && (
                    <span className="px-2 py-0.5 bg-blue-500 rounded-full text-xs text-white">1</span>
                  )}
                </button>
              </div>

              <div className="text-sm text-gray-600">
                {filteredTrends.length} {filteredTrends.length === 1 ? 'trend' : 'trends'}
              </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Status Filter</label>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as FilterOption)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="all">All Status</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="engagement">Most Engagement</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredTrends.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6">
              <TrendingUpIcon className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {filter === 'all' ? 'No trends yet' : `No ${filter} trends`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? 'Start spotting trends to see them here!' 
                : 'Try changing your filters or submit new trends'}
            </p>
            <button
              onClick={() => setShowSubmitForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Submit Your First Trend
            </button>
          </motion.div>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredTrends.map((trend, index) => {
                    return (
                    <motion.div
                      key={trend.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -5 }}
                      className="group relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div 
                        className="relative bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-xl transition-all duration-300 shadow-lg cursor-pointer"
                        onClick={() => setSelectedTrend(trend)}
                      >
                        {/* Thumbnail */}
                        <div className="relative h-48 bg-gray-100 overflow-hidden">
                          {(trend.thumbnail_url || trend.screenshot_url || trend.post_url) ? (
                            <>
                              <img 
                                src={trend.thumbnail_url || trend.screenshot_url || ''}
                                alt="Trend"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  // Try YouTube thumbnail if it's a YouTube URL
                                  if (trend.post_url && trend.post_url.includes('youtube')) {
                                    const match = trend.post_url.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                                    if (match && match[1]) {
                                      target.src = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
                                      return;
                                    }
                                  }
                                  // Otherwise hide and show placeholder
                                  target.style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-60" />
                            </>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                              <TrendingUpIcon className="w-16 h-16 text-gray-400" />
                            </div>
                          )}
                            
                            {/* Status Badge with Stage */}
                            <div className="absolute top-3 right-3 space-y-2">
                              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${
                                trend.status === 'approved' ? 'bg-blue-100/90 text-blue-700 border border-blue-200' :
                                trend.status === 'rejected' ? 'bg-red-100/90 text-red-700 border border-red-200' :
                                'bg-gray-100/90 text-gray-700 border border-gray-200'
                              }`}>
                                {getStatusIcon(trend.status)}
                                <span className="capitalize">{trend.status}</span>
                              </div>
                              {trend.stage && (
                                <div className={`flex items-center gap-1 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium shadow-lg border border-gray-200 hover:scale-105 transition-transform duration-200 ${
                                  trend.stage === 'viral' ? 'text-red-600 animate-bounce' :
                                  trend.stage === 'trending' ? 'text-green-600 animate-pulse' :
                                  trend.stage === 'declining' ? 'text-orange-600' :
                                  'text-gray-600'
                                }`}>
                                  <ZapIcon className="w-3 h-3" />
                                  <span>
                                    {trend.stage === 'submitted' ? 'Just Starting' :
                                     trend.stage === 'trending' ? 'Trending' :
                                     trend.stage === 'viral' ? 'Going Viral!' :
                                     trend.stage === 'peaked' ? 'At Peak' :
                                     trend.stage === 'declining' ? 'Declining' :
                                     trend.stage}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Category Badge */}
                            <div className="absolute bottom-3 left-3">
                              <div className="flex items-center gap-1 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-gray-700 text-xs border border-gray-200 hover:bg-white transition-colors duration-200">
                                <span className="text-base">{getCategoryEmoji(trend.category)}</span>
                                <span>{getCategoryLabel(trend.category)}</span>
                              </div>
                            </div>

                            {/* External Link */}
                            {trend.post_url && (
                              <a 
                                href={trend.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-md rounded-full text-gray-700 hover:bg-white transition-all border border-gray-200"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLinkIcon className="w-4 h-4" />
                              </a>
                            )}
                          </div>

                        <div className="p-6">
                          {/* Creator Info */}
                          {(trend.creator_handle || trend.creator_name) && (
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center border border-blue-200">
                                <UserIcon className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                {trend.creator_handle && trend.creator_handle !== '0' && trend.evidence?.platform ? (
                                  <a 
                                    href={getCreatorProfileUrl(trend.evidence.platform, trend.creator_handle)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-gray-700 hover:text-blue-600 truncate block transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {trend.creator_handle}
                                  </a>
                                ) : (
                                  <p className="text-sm font-medium text-gray-700 truncate">
                                    {(trend.creator_handle && trend.creator_handle !== '0') ? trend.creator_handle : (trend.creator_name && trend.creator_name !== '0') ? trend.creator_name : ''}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400" title={formatFullDate(trend.created_at)}>
                                  📅 {formatFullDate(trend.created_at)}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Title from description */}
                          <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                            {trend.evidence?.title || (trend.description && trend.description !== '0' ? trend.description.split('\n')[0] : 'Untitled Trend')}
                          </h3>

                          {/* Caption */}
                          {trend.post_caption && trend.post_caption !== '0' && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              "{trend.post_caption}"
                            </p>
                          )}

                          {/* Engagement Stats - Only show if has values */}
                          {((trend.likes_count && trend.likes_count > 0) || (trend.comments_count && trend.comments_count > 0) || (trend.shares_count && trend.shares_count > 0) || (trend.views_count && trend.views_count > 0)) && (
                            <div className="flex items-center gap-4 mb-4">
                              {trend.likes_count && trend.likes_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <HeartIcon className="w-4 h-4 text-red-500" />
                                  <p className="text-xs text-gray-600">{formatEngagement(trend.likes_count)}</p>
                                </div>
                              )}
                              {trend.comments_count && trend.comments_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageCircleIcon className="w-4 h-4 text-blue-500" />
                                  <p className="text-xs text-gray-600">{formatEngagement(trend.comments_count)}</p>
                                </div>
                              )}
                              {trend.shares_count && trend.shares_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <ShareIcon className="w-4 h-4 text-green-500" />
                                  <p className="text-xs text-gray-600">{formatEngagement(trend.shares_count)}</p>
                                </div>
                              )}
                              {trend.views_count && trend.views_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <EyeIcon className="w-4 h-4 text-purple-500" />
                                  <p className="text-xs text-gray-600">{formatEngagement(trend.views_count)}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Hashtags */}
                          {trend.hashtags && trend.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {trend.hashtags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                                  #{tag}
                                </span>
                              ))}
                              {trend.hashtags.length > 3 && (
                                <span className="text-xs text-gray-500">+{trend.hashtags.length - 3}</span>
                              )}
                            </div>
                          )}

                          {/* Enhanced Metadata Display */}
                          <div className="pt-4 border-t border-gray-100 space-y-3">
                            {/* Primary Analysis Row */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col items-center bg-gray-50/60 rounded-lg px-2 py-1.5 border border-gray-200/50">
                                <span className={`text-xs font-medium ${getVelocityDisplay(getTrendVelocity(trend)).color}`}>
                                  {getVelocityDisplay(getTrendVelocity(trend)).text}
                                </span>
                                <span className="text-xs text-gray-400">Velocity</span>
                              </div>
                              <div className="flex flex-col items-center bg-gray-50/60 rounded-lg px-2 py-1.5 border border-gray-200/50">
                                <span className="text-xs font-medium text-gray-600">
                                  {(trend as any).trend_size === 'micro' ? '🔬 Micro' :
                                   (trend as any).trend_size === 'niche' ? '🎯 Niche' :
                                   (trend as any).trend_size === 'viral' ? '🔥 Viral' :
                                   (trend as any).trend_size === 'medium' ? '🔥 Medium' :
                                   (trend as any).trend_size === 'mega' ? '💥 Mega' :
                                   (trend as any).trend_size === 'large' ? '💥 Large' :
                                   (trend as any).trend_size === 'global' ? '🌍 Global' :
                                   '📊 ' + ((trend as any).trend_size ? (trend as any).trend_size.charAt(0).toUpperCase() + (trend as any).trend_size.slice(1) : 'Unknown')}
                                </span>
                                <span className="text-xs text-gray-400">Size</span>
                              </div>
                            </div>
                            
                            {/* AI & Audience Intelligence */}
                            {((trend as any).ai_angle || (trend as any).audience_age) && (
                              <div className="grid grid-cols-2 gap-2">
                                {(trend as any).ai_angle && (
                                  <div className="flex flex-col items-center bg-gray-50/60 rounded-lg px-2 py-1.5 border border-gray-200/50">
                                    <span className="text-xs font-medium text-gray-600">
                                      {(trend as any).ai_angle === 'not_ai' ? '👤 Human' :
                                       (trend as any).ai_angle === 'using_ai' ? '🎨 Using AI' :
                                       (trend as any).ai_angle === 'reacting_to_ai' ? '😮 Reacting to AI' :
                                       (trend as any).ai_angle === 'ai_tool_viral' ? '🚀 AI Tool Viral' :
                                       (trend as any).ai_angle === 'ai_technique' ? '💡 AI Technique' :
                                       (trend as any).ai_angle === 'anti_ai' ? '🚫 Anti-AI' :
                                       // Fallback for old values
                                       (trend as any).ai_angle === 'ai_created' ? '🤖 AI Created' :
                                       (trend as any).ai_angle === 'ai_enhanced' ? '✨ AI Enhanced' :
                                       (trend as any).ai_angle === 'about_ai' ? '💭 About AI' : '🔍 AI'}
                                    </span>
                                    <span className="text-xs text-gray-400">AI Signal</span>
                                  </div>
                                )}
                                {((trend as any).audience_age && Array.isArray((trend as any).audience_age) && (trend as any).audience_age.length > 0) || (trend as any).driving_generation ? (
                                  <div className="flex flex-col items-center bg-amber-50/60 rounded-lg px-2 py-1.5 border border-amber-200/50">
                                    <span className="text-xs font-medium text-amber-700">
                                      {(trend as any).driving_generation ? (
                                        (trend as any).driving_generation === 'gen_alpha' ? '📱 Gen Alpha' :
                                        (trend as any).driving_generation === 'gen_z' ? '🎮 Gen Z' :
                                        (trend as any).driving_generation === 'millennials' ? '💻 Millennials' :
                                        (trend as any).driving_generation === 'gen_x' ? '💿 Gen X' :
                                        (trend as any).driving_generation === 'boomers' ? '📺 Boomers' :
                                        (trend as any).audience_age?.slice(0, 2).join(', ')
                                      ) : (trend as any).audience_age?.slice(0, 2).join(', ')}
                                    </span>
                                    <span className="text-xs text-amber-500">Who's Driving</span>
                                  </div>
                                ) : null}
                              </div>
                            )}
                            
                            {/* Trend Origin & Evolution Status */}
                            {((trend as any).trend_origin || (trend as any).evolution_status) && (
                              <div className="flex items-center gap-2 mt-2">
                                {(trend as any).trend_origin && (
                                  <div className="flex items-center gap-1 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg px-2 py-1 border border-teal-200/50">
                                    <span className="text-xs font-medium text-teal-700">
                                      {(trend as any).trend_origin === 'organic' ? '🌱 Organic' :
                                       (trend as any).trend_origin === 'influencer' ? '⭐ Influencer' :
                                       (trend as any).trend_origin === 'brand' ? '💼 Brand' :
                                       (trend as any).trend_origin === 'ai_generated' ? '🤖 AI' :
                                       '🔍 Origin'}
                                    </span>
                                  </div>
                                )}
                                {(trend as any).evolution_status && (
                                  <div className="flex items-center gap-1 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg px-2 py-1 border border-purple-200/50">
                                    <span className="text-xs font-medium text-purple-700">
                                      {(trend as any).evolution_status === 'original' ? '✨ Original' :
                                       (trend as any).evolution_status === 'variants' ? '🔄 Remixing' :
                                       (trend as any).evolution_status === 'parody' ? '😂 Parody' :
                                       (trend as any).evolution_status === 'meta' ? '🤯 Meta' :
                                       (trend as any).evolution_status === 'final' ? '👻 Won\'t Die' :
                                       '📊 Status'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Category Answers Display - Only show if has valid non-zero values */}
                            {(() => {
                              const validAnswers = (trend as any).category_answers ? 
                                Object.entries((trend as any).category_answers)
                                  .filter(([key, value]) => 
                                    value !== 0 && 
                                    value !== '0' && 
                                    value !== null && 
                                    value !== undefined && 
                                    value !== '' &&
                                    // Exclude old category fields that shouldn't be displayed
                                    true // Show all metadata fields now that deprecated ones are removed
                                  ) : [];
                              
                              if (validAnswers.length > 0) {
                                return (
                                  <div className="bg-gray-50/60 rounded-lg p-2 border border-gray-200/50">
                                    <div className="text-xs text-gray-500 font-medium mb-1">Category Insights</div>
                                    <div className="space-y-1">
                                      {validAnswers.slice(0, 2).map(([key, value]: [string, any]) => (
                                        <div key={key} className="flex justify-between text-xs">
                                          <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                                          <span className="text-gray-600 font-medium">{String(value)}</span>
                                        </div>
                                      ))}
                                      {validAnswers.length > 2 && (
                                        <div className="text-xs text-blue-500 font-medium">+{validAnswers.length - 2} more insights</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            {/* Validation & Status Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {((trend.approve_count && trend.approve_count > 0) || (trend.reject_count && trend.reject_count > 0)) && (
                                  <div className="flex items-center gap-1.5 text-xs bg-white rounded-lg px-2 py-1 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    {trend.approve_count && trend.approve_count > 0 && (
                                      <span className="text-green-600 font-medium">👍 {trend.approve_count || 0}</span>
                                    )}
                                    {trend.approve_count && trend.approve_count > 0 && trend.reject_count && trend.reject_count > 0 && (
                                      <span className="text-gray-400">·</span>
                                    )}
                                    {trend.reject_count && trend.reject_count > 0 && (
                                      <span className="text-red-500 font-medium">👎 {trend.reject_count || 0}</span>
                                    )}
                                  </div>
                                )}
                                {trend.validation_status && trend.validation_status !== 'pending' && (
                                  trend.validation_status === 'approved' || trend.validation_status === 'rejected' ? (
                                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                                      trend.validation_status === 'approved' ? 'bg-green-100 text-green-600 border-green-200' :
                                      'bg-red-100 text-red-600 border-red-200'
                                    }`}>
                                      {trend.validation_status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                                    </div>
                                  ) : null
                                )}
                              </div>
                              
                              {trend.xp_amount && trend.xp_amount > 0 && (
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                                  trend.xp_awarded 
                                    ? 'bg-green-100 text-green-600 border-green-200' 
                                    : 'bg-yellow-100 text-yellow-600 border-yellow-200'
                                }`}>
                                  <ZapIcon className="w-3 h-3" />
                                  <span>{trend.xp_amount} XP</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Enhanced Marketing Tags */}
                            {((trend.evidence?.categories?.length || 0) > 0 || (trend.evidence?.moods?.length || 0) > 0) && (
                              <div className="space-y-1">
                                <div className="text-xs text-gray-600 font-medium">Marketing Tags</div>
                                <div className="flex flex-wrap gap-1">
                                  {trend.evidence?.categories?.map((cat: string, i: number) => (
                                    <span key={`cat-${i}`} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full border border-purple-200 font-medium">
                                      📊 {cat}
                                    </span>
                                  ))}
                                  {trend.evidence?.moods?.map((mood: string, i: number) => (
                                    <span key={`mood-${i}`} className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded-full border border-pink-200 font-medium">
                                      🎭 {mood}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Vote Display */}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <SimpleVoteDisplay 
                                trendId={trend.id}
                                initialVotes={{
                                  wave: 0,
                                  fire: 0,
                                  declining: 0,
                                  dead: 0
                                }}
                                compact={true}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )})}
                </AnimatePresence>
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredTrends.map((trend, index) => {
                    return (
                    <motion.div
                      key={trend.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="group"
                    >
                      <div 
                        className="relative bg-white/95 backdrop-blur-md rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer"
                        onClick={() => setSelectedTrend(trend)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Thumbnail */}
                          {(trend.thumbnail_url || trend.screenshot_url) && (
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                              <img 
                                src={trend.thumbnail_url || trend.screenshot_url || ''} 
                                alt="Trend"
                                className="w-full h-full object-cover"
                              />
                              {trend.post_url && (
                                <a 
                                  href={trend.post_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                  <ExternalLinkIcon className="w-6 h-6 text-gray-700" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                  {trend.evidence?.title || (trend.description && trend.description !== '0' ? trend.description.split('\n')[0] : 'Untitled Trend')}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <span>{getCategoryEmoji(trend.category)}</span>
                                    {getCategoryLabel(trend.category)}
                                  </span>
                                  {(trend.creator_handle || trend.creator_name) && (
                                    <span className="flex items-center gap-1">
                                      <UserIcon className="w-3 h-3" />
                                      {trend.creator_handle && trend.creator_handle !== '0' && trend.evidence?.platform ? (
                                        <a 
                                          href={getCreatorProfileUrl(trend.evidence.platform, trend.creator_handle)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="hover:text-blue-600 transition-colors"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {trend.creator_handle}
                                        </a>
                                      ) : (
                                        (trend.creator_handle && trend.creator_handle !== '0') ? trend.creator_handle : (trend.creator_name && trend.creator_name !== '0') ? trend.creator_name : ''
                                      )}
                                    </span>
                                  )}
                                  <span title={formatFullDate(trend.created_at)}>📅 {formatFullDate(trend.created_at)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className={`flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(trend.status)} rounded-full text-white text-xs font-semibold`}>
                                  {getStatusIcon(trend.status)}
                                  <span className="capitalize">{trend.status}</span>
                                </div>
                                {trend.stage && (
                                  <div className={`flex items-center gap-1 px-3 py-1.5 ${getStageInfo(trend.stage).bgColor} rounded-full text-xs font-medium ${getStageInfo(trend.stage).color}`}>
                                    <span>{getStageInfo(trend.stage).icon}</span>
                                    <span>{getStageInfo(trend.stage).text}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {trend.post_caption && trend.post_caption !== '0' && (
                              <p className="text-sm text-gray-600 mb-3">"{trend.post_caption}"</p>
                            )}

                            {/* Only show engagement stats if they have values */}
                            {((trend.likes_count && trend.likes_count > 0) || (trend.comments_count && trend.comments_count > 0) || (trend.shares_count && trend.shares_count > 0) || (trend.views_count && trend.views_count > 0)) && (
                              <div className="flex items-center gap-6 mb-3">
                                {trend.likes_count && trend.likes_count > 0 && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <HeartIcon className="w-4 h-4 text-red-500" />
                                    <span>{formatEngagement(trend.likes_count)}</span>
                                  </div>
                                )}
                                {trend.comments_count && trend.comments_count > 0 && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <MessageCircleIcon className="w-4 h-4 text-blue-600" />
                                    <span>{formatEngagement(trend.comments_count)}</span>
                                  </div>
                                )}
                                {trend.shares_count && trend.shares_count > 0 && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <ShareIcon className="w-4 h-4 text-green-600" />
                                    <span>{formatEngagement(trend.shares_count)}</span>
                                  </div>
                                )}
                                {trend.views_count && trend.views_count > 0 && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <EyeIcon className="w-4 h-4 text-purple-600" />
                                    <span>{formatEngagement(trend.views_count)}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Enhanced Metadata Grid for List View */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                              <div className="flex flex-col items-center bg-gray-50/60 rounded-lg px-3 py-2 border border-gray-200/50">
                                <span className={`text-sm font-medium ${getVelocityDisplay(getTrendVelocity(trend)).color}`}>
                                  {getVelocityDisplay(getTrendVelocity(trend)).text}
                                </span>
                                <span className="text-xs text-gray-400">Velocity</span>
                              </div>
                              <div className="flex flex-col items-center bg-gray-50/60 rounded-lg px-3 py-2 border border-gray-200/50">
                                <span className="text-sm font-medium text-gray-600">
                                  {(trend as any).trend_size === 'micro' ? '🔬 Micro' :
                                   (trend as any).trend_size === 'niche' ? '🎯 Niche' :
                                   (trend as any).trend_size === 'viral' ? '🔥 Viral' :
                                   (trend as any).trend_size === 'medium' ? '🔥 Medium' :
                                   (trend as any).trend_size === 'mega' ? '💥 Mega' :
                                   (trend as any).trend_size === 'large' ? '💥 Large' :
                                   (trend as any).trend_size === 'global' ? '🌍 Global' :
                                   '📊 ' + ((trend as any).trend_size ? (trend as any).trend_size.charAt(0).toUpperCase() + (trend as any).trend_size.slice(1) : 'Unknown')}
                                </span>
                                <span className="text-xs text-gray-400">Size</span>
                              </div>
                              {(trend as any).ai_angle && (
                                <div className="flex flex-col items-center bg-gray-50/60 rounded-lg px-3 py-2 border border-gray-200/50">
                                  <span className="text-sm font-medium text-gray-600">
                                    {(trend as any).ai_angle === 'not_ai' ? '👤' :
                                     (trend as any).ai_angle === 'using_ai' ? '🎨' :
                                     (trend as any).ai_angle === 'reacting_to_ai' ? '😮' :
                                     (trend as any).ai_angle === 'ai_tool_viral' ? '🚀' :
                                     (trend as any).ai_angle === 'ai_technique' ? '💡' :
                                     (trend as any).ai_angle === 'anti_ai' ? '🚫' :
                                     // Fallback for old values
                                     (trend as any).ai_angle === 'ai_created' ? '🤖' :
                                     (trend as any).ai_angle === 'ai_enhanced' ? '✨' :
                                     (trend as any).ai_angle === 'about_ai' ? '💭' : '🔍'}
                                  </span>
                                  <span className="text-xs text-gray-400">AI Signal</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Voting and Status */}
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              {((trend.approve_count && trend.approve_count > 0) || (trend.reject_count && trend.reject_count > 0)) && (
                                <div className="flex items-center gap-2 bg-gray-50/60 rounded-lg px-3 py-1.5 border border-gray-200/50">
                                  {trend.approve_count && trend.approve_count > 0 && (
                                    <span className="text-sm text-gray-600 font-medium">👍 {trend.approve_count || 0}</span>
                                  )}
                                  {trend.approve_count && trend.approve_count > 0 && trend.reject_count && trend.reject_count > 0 && (
                                    <span className="text-sm text-gray-300">·</span>
                                  )}
                                  {trend.reject_count && trend.reject_count > 0 && (
                                    <span className="text-sm text-gray-500 font-medium">👎 {trend.reject_count || 0}</span>
                                  )}
                                </div>
                              )}
                              {trend.validation_status && trend.validation_status !== 'pending' && (
                                <div className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                                  trend.validation_status === 'approved' ? 'bg-blue-50/60 text-blue-600 border-blue-200/50' :
                                  trend.validation_status === 'rejected' ? 'bg-gray-50/60 text-gray-500 border-gray-200/50' :
                                  'bg-gray-50/60 text-gray-500 border-gray-200/50'
                                }`}>
                                  {trend.validation_status === 'approved' ? '✅ Approved' :
                                   trend.validation_status === 'rejected' ? '❌ Rejected' :
                                   ''}
                                </div>
                              )}
                              {trend.xp_amount && trend.xp_amount > 0 && (
                                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                                  trend.xp_awarded 
                                    ? 'bg-green-100 text-green-600 border-green-200' 
                                    : 'bg-yellow-100 text-yellow-600 border-yellow-200'
                                }`}>
                                  <ZapIcon className="w-4 h-4" />
                                  <span>{trend.xp_amount} XP</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Category Insights for List View - Only show if has valid non-zero values */}
                            {(() => {
                              const validAnswers = (trend as any).category_answers ? 
                                Object.entries((trend as any).category_answers)
                                  .filter(([key, value]) => 
                                    value !== 0 && 
                                    value !== '0' && 
                                    value !== null && 
                                    value !== undefined && 
                                    value !== '' &&
                                    // Exclude old category fields that shouldn't be displayed
                                    true // Show all metadata fields now that deprecated ones are removed
                                  ) : [];
                              
                              if (validAnswers.length > 0) {
                                return (
                                  <div className="bg-gray-50/60 rounded-lg p-3 mb-3 border border-gray-200/50">
                                    <div className="text-sm text-gray-500 font-medium mb-2">📊 Category Insights</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {validAnswers.slice(0, 4).map(([key, value]: [string, any]) => (
                                        <div key={key} className="flex justify-between text-sm">
                                          <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                                          <span className="text-gray-600 font-medium">{String(value)}</span>
                                        </div>
                                      ))}
                                      {validAnswers.length > 4 && (
                                        <div className="text-sm text-blue-500 font-medium col-span-full">+{validAnswers.length - 4} more insights</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Enhanced Marketing Tags and Hashtags */}
                            {((trend.evidence?.categories?.length > 0) || (trend.evidence?.moods?.length > 0) || (trend.hashtags && trend.hashtags.length > 0)) && (
                              <div className="space-y-2">
                                <div className="text-sm text-gray-700 font-medium">🏷️ Tags & Keywords</div>
                                <div className="flex flex-wrap gap-1">
                                  {trend.evidence?.categories?.map((cat: string, i: number) => (
                                    <span key={`cat-${i}`} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full border border-purple-200 font-medium">
                                      📊 {cat}
                                    </span>
                                  ))}
                                  {trend.evidence?.moods?.map((mood: string, i: number) => (
                                    <span key={`mood-${i}`} className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded-full border border-pink-200 font-medium">
                                      🎭 {mood}
                                    </span>
                                  ))}
                                  {trend.hashtags?.slice(0, 5).map((tag, i) => (
                                    <span key={`tag-${i}`} className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full border border-blue-200 font-medium">
                                      #{tag}
                                    </span>
                                  ))}
                                  {trend.hashtags && trend.hashtags.length > 5 && (
                                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                                      +{trend.hashtags.length - 5} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Vote Display */}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <SimpleVoteDisplay 
                                trendId={trend.id}
                                initialVotes={{
                                  wave: 0,
                                  fire: 0,
                                  declining: 0,
                                  dead: 0
                                }}
                                compact={false}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )})}
                </AnimatePresence>
              </div>
            )}

            {/* Timeline View - Horizontal scrolling */}
            {viewMode === 'timeline' && (
              <div className="relative">
                {/* Timeline Header with Instructions */}
                <div className="mb-6 text-center">
                  <p className="text-sm text-gray-600">← Scroll horizontally to navigate through time →</p>
                  <p className="text-xs text-gray-500 mt-1">Most recent on the right, older trends on the left</p>
                </div>

                {/* Timeline Container */}
                <div className="relative">
                  {/* Horizontal Scrollable Area */}
                  <div className="overflow-x-auto pb-4" style={{ scrollBehavior: 'smooth' }}>
                    <div className="relative inline-flex items-start gap-8 px-8 py-12 min-w-full">
                      
                      {/* Group trends by date */}
                      {(() => {
                        // Group trends by date
                        const groupedByDate = filteredTrends.reduce((acc, trend) => {
                          const date = new Date(trend.created_at).toDateString();
                          if (!acc[date]) {
                            acc[date] = [];
                          }
                          acc[date].push(trend);
                          return acc;
                        }, {} as Record<string, typeof filteredTrends>);

                        // Sort dates (oldest first for left-to-right chronological order)
                        const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
                          new Date(a).getTime() - new Date(b).getTime()
                        );

                        return (
                          <>
                            {/* Timeline Line - positioned behind cards */}
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400/30 via-blue-500/50 to-blue-500 transform -translate-y-1/2" />
                            
                            {sortedDates.map((dateKey, dateIndex) => {
                              const dateTrends = groupedByDate[dateKey];
                              const date = new Date(dateKey);
                              const isToday = date.toDateString() === new Date().toDateString();
                              const isYesterday = date.toDateString() === 
                                new Date(Date.now() - 86400000).toDateString();
                              
                              return (
                                <div key={dateKey} className="relative flex-shrink-0">
                                  {/* Date Column */}
                                  <div className="relative">
                                    {/* Date Label */}
                                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-20">
                                      <div className="text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1 rounded-full whitespace-nowrap">
                                        {isToday ? 'Today' : 
                                         isYesterday ? 'Yesterday' :
                                         date.toLocaleDateString('en-US', { 
                                           month: 'short', 
                                           day: 'numeric',
                                           year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                         })}
                                      </div>
                                    </div>

                                    {/* Date Node on Timeline */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                                      <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full ring-2 ring-white" />
                                    </div>

                                    {/* Trends Stack for this date */}
                                    <div className="flex flex-col gap-4 pt-4">
                                      {dateTrends.map((trend, trendIndex) => (
                                        <motion.div
                                          key={trend.id}
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ 
                                            delay: dateIndex * 0.05 + trendIndex * 0.03,
                                            duration: 0.3
                                          }}
                                          className="relative"
                                        >
                                          {/* Connection Line to Timeline */}
                                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 w-px h-8 bg-gray-400/50" 
                                               style={{ 
                                                 height: `${Math.abs((trendIndex - (dateTrends.length - 1) / 2) * 120 + 40)}px`,
                                                 top: trendIndex < dateTrends.length / 2 ? '50%' : 'auto',
                                                 bottom: trendIndex >= dateTrends.length / 2 ? '50%' : 'auto'
                                               }} />

                                          {/* Trend Card */}
                                          <div className="group cursor-pointer"
                                               style={{ 
                                                 marginTop: trendIndex === 0 ? '60px' : '0',
                                                 transform: `translateY(${(trendIndex - (dateTrends.length - 1) / 2) * 120}px)`
                                               }}>
                                            <motion.div
                                              whileHover={{ scale: 1.02 }}
                                              className="relative w-72 bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                                              onClick={() => setSelectedTrend(trend)}
                                            >
                                              {/* Status Badge */}
                                              <div className="absolute top-2 right-2 z-10">
                                                <div className={`flex items-center gap-1 px-2 py-1 bg-gradient-to-r ${getStatusColor(trend.status)} rounded-full text-white text-xs font-semibold`}>
                                                  {getStatusIcon(trend.status)}
                                                  <span className="capitalize">{trend.status}</span>
                                                </div>
                                              </div>

                                              {/* Thumbnail */}
                                              {(trend.thumbnail_url || trend.screenshot_url) ? (
                                                <div className="relative h-32 overflow-hidden">
                                                  <img 
                                                    src={trend.thumbnail_url || trend.screenshot_url || ''}
                                                    alt="Trend"
                                                    className="w-full h-full object-cover"
                                                  />
                                                  <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
                                                  
                                                  {/* Category Badge */}
                                                  <div className="absolute bottom-2 left-2">
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 text-xs shadow-sm">
                                                      <span>{getCategoryEmoji(trend.category)}</span>
                                                      <span>{getCategoryLabel(trend.category)}</span>
                                                    </div>
                                                  </div>

                                                  {/* External Link */}
                                                  {trend.post_url && (
                                                    <a 
                                                      href={trend.post_url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="absolute top-2 left-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-gray-600 hover:bg-white shadow-sm transition-all"
                                                      onClick={(e) => e.stopPropagation()}
                                                    >
                                                      <ExternalLinkIcon className="w-3 h-3" />
                                                    </a>
                                                  )}
                                                </div>
                                              ) : (
                                                <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                                                  <div className="text-center">
                                                    <span className="text-3xl">{getCategoryEmoji(trend.category)}</span>
                                                    <p className="text-xs text-gray-500 mt-1">{getCategoryLabel(trend.category)}</p>
                                                  </div>
                                                </div>
                                              )}

                                              {/* Content */}
                                              <div className="p-3">
                                                {/* Title */}
                                                <h3 className="text-sm font-semibold text-gray-800 mb-2 line-clamp-1">
                                                  {trend.evidence?.title || (trend.description && trend.description !== '0' ? trend.description.split('\n')[0] : 'Untitled Trend')}
                                                </h3>

                                                {/* Creator & Time */}
                                                <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
                                                  {(trend.creator_handle || trend.creator_name) && (
                                                    <div className="flex items-center gap-1">
                                                      <UserIcon className="w-3 h-3" />
                                                      <span className="truncate max-w-[120px]">
                                                        {(trend.creator_handle && trend.creator_handle !== '0') ? trend.creator_handle : (trend.creator_name && trend.creator_name !== '0') ? trend.creator_name : ''}
                                                      </span>
                                                    </div>
                                                  )}
                                                  <div className="flex items-center gap-1">
                                                    <ClockIcon className="w-3 h-3" />
                                                    <span>
                                                      {new Date(trend.created_at).toLocaleTimeString('en-US', { 
                                                        hour: 'numeric', 
                                                        minute: '2-digit',
                                                        hour12: true 
                                                      })}
                                                    </span>
                                                  </div>
                                                </div>

                                                {/* Engagement Stats */}
                                                {((trend.likes_count && trend.likes_count > 0) || (trend.views_count && trend.views_count > 0)) && (
                                                  <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
                                                    {trend.likes_count && trend.likes_count > 0 && (
                                                      <div className="flex items-center gap-0.5">
                                                        <HeartIcon className="w-3 h-3 text-red-500" />
                                                        <span>{formatEngagement(trend.likes_count)}</span>
                                                      </div>
                                                    )}
                                                    {trend.views_count && trend.views_count > 0 && (
                                                      <div className="flex items-center gap-0.5">
                                                        <EyeIcon className="w-3 h-3 text-purple-600" />
                                                        <span>{formatEngagement(trend.views_count)}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}

                                                {/* Velocity & Audience */}
                                                <div className="flex items-center justify-between text-xs">
                                                  <div className="flex items-center gap-2">
                                                    <span className={`font-bold ${getVelocityDisplay(getTrendVelocity(trend)).color}`}>
                                                      {getVelocityDisplay(getTrendVelocity(trend)).text.split(' ')[1]}
                                                    </span>
                                                    {((trend.views_count || 0) + (trend.likes_count || 0) * 10) > 0 && (
                                                      <>
                                                        <span className="text-gray-500">•</span>
                                                        <span className="text-gray-600">
                                                          {formatEngagement((trend.views_count || 0) + (trend.likes_count || 0) * 10)} reach
                                                        </span>
                                                      </>
                                                    )}
                                                  </div>
                                                  {trend.xp_amount && trend.xp_amount > 0 && (
                                                    <div className={`px-2 py-0.5 rounded-full ${
                                                      trend.xp_awarded 
                                                        ? 'bg-green-100 text-green-600' 
                                                        : 'bg-yellow-100 text-yellow-600'
                                                    }`}>
                                                      {trend.xp_amount} XP
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </motion.div>
                                          </div>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Trend Submission Form Modal */}
      {showSubmitForm && (
        <SmartTrendSubmission
          onClose={() => setShowSubmitForm(false)}
          onSubmit={handleTrendSubmit}
        />
      )}

      {/* Trend Detail Modal */}
      <AnimatePresence>
        {selectedTrend && (
          <TrendDetailModal 
            trend={selectedTrend} 
            onClose={() => setSelectedTrend(null)} 
          />
        )}
      </AnimatePresence>
      
      {/* XP notifications handled by global system */}
    </div>
  );
}
