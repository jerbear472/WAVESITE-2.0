'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
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
  ExternalLink as ExternalLinkIcon,
  User as UserIcon,
  Zap as ZapIcon,
  Sparkles as SparklesIcon,
  BarChart as BarChartIcon,
  Award as AwardIcon,
  Video as VideoIcon,
  Image as ImageIcon,
  Music as MusicIcon,
  BookOpen as BookOpenIcon,
  ShoppingBag as ShoppingBagIcon,
  Gamepad2 as GamepadIcon,
  Palette as PaletteIcon,
  ChevronRight as ChevronRightIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  Volume2 as VolumeIcon,
  Star as StarIcon,
  TrendingDown as TrendingDownIcon,
  AlertCircle as AlertCircleIcon,
  CheckCircle as CheckCircleIcon,
  Activity as ActivityIcon,
  Globe as GlobeIcon,
  Layers as LayersIcon,
  Target as TargetIcon,
  Flame as FlameIcon,
  Wind as WindIcon,
  Droplet as DropletIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  Cloud as CloudIcon
} from 'lucide-react'

interface EnhancedTrendTileProps {
  trend: {
    id: string
    spotter_id: string
    category: string
    description: string
    screenshot_url?: string
    evidence?: any
    virality_prediction?: number
    predicted_peak_date?: string
    status: 'pending' | 'approved' | 'rejected' | 'viral'
    quality_score: number
    validation_count: number
    bounty_amount: number
    bounty_paid: boolean
    created_at: string
    validated_at?: string
    mainstream_at?: string
    stage?: 'submitted' | 'validating' | 'trending' | 'viral' | 'peaked' | 'declining' | 'auto_rejected'
    trend_momentum_score?: number
    positive_validations?: number
    negative_validations?: number
    approve_count?: number
    reject_count?: number
    validation_status?: 'pending' | 'approved' | 'rejected'
    creator_handle?: string
    creator_name?: string
    post_caption?: string
    likes_count?: number
    comments_count?: number
    shares_count?: number
    views_count?: number
    hashtags?: string[]
    post_url?: string
    thumbnail_url?: string
    posted_at?: string
    wave_score?: number
    trend_velocity?: 'just_starting' | 'picking_up' | 'viral' | 'peaked' | 'declining'
  }
  onExpand?: () => void
  isCompact?: boolean
  animationDelay?: number
  viewMode?: 'grid' | 'list' | 'timeline'
}

// Enhanced category icons and colors
const categoryConfig = {
  'visual_style': { 
    icon: PaletteIcon, 
    emoji: '🎨', 
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20'
  },
  'audio_music': { 
    icon: MusicIcon, 
    emoji: '🎵', 
    color: 'from-green-500 to-teal-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20'
  },
  'creator_technique': { 
    icon: VideoIcon, 
    emoji: '🎬', 
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  'meme_format': { 
    icon: HeartIcon, 
    emoji: '😂', 
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  'product_brand': { 
    icon: ShoppingBagIcon, 
    emoji: '🛍️', 
    color: 'from-red-500 to-pink-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20'
  },
  'behavior_pattern': { 
    icon: BarChartIcon, 
    emoji: '📊', 
    color: 'from-indigo-500 to-purple-500',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20'
  }
}

// Velocity configurations with enhanced animations
const velocityConfig = {
  'just_starting': { 
    text: 'Just Starting', 
    icon: SparklesIcon,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    animation: 'pulse',
    gradient: 'from-blue-400 to-blue-600'
  },
  'picking_up': { 
    text: 'Picking Up', 
    icon: TrendingUpIcon,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    animation: 'bounce',
    gradient: 'from-green-400 to-green-600'
  },
  'viral': { 
    text: 'Going Viral', 
    icon: FlameIcon,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    animation: 'spin',
    gradient: 'from-red-400 to-orange-600'
  },
  'peaked': { 
    text: 'At Peak', 
    icon: ZapIcon,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    animation: 'ping',
    gradient: 'from-purple-400 to-purple-600'
  },
  'declining': { 
    text: 'Declining', 
    icon: TrendingDownIcon,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    animation: 'fade',
    gradient: 'from-orange-400 to-orange-600'
  }
}

// Status configurations
const statusConfig = {
  'approved': { 
    icon: CheckCircleIcon, 
    color: 'from-green-500 to-emerald-600',
    textColor: 'text-green-400',
    bgColor: 'bg-green-500/20'
  },
  'viral': { 
    icon: ZapIcon, 
    color: 'from-purple-500 to-pink-600',
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-500/20'
  },
  'rejected': { 
    icon: AlertCircleIcon, 
    color: 'from-red-500 to-rose-600',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/20'
  },
  'pending': { 
    icon: ClockIcon, 
    color: 'from-yellow-500 to-amber-600',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20'
  }
}

export default function EnhancedTrendTile({ 
  trend, 
  onExpand, 
  isCompact = false,
  animationDelay = 0,
  viewMode = 'grid'
}: EnhancedTrendTileProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Motion values for interactive animations
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-100, 100], [10, -10])
  const rotateY = useTransform(x, [-100, 100], [-10, 10])

  // Get configurations with safe fallbacks
  const category = categoryConfig[trend.category as keyof typeof categoryConfig] || categoryConfig['behavior_pattern']
  const velocityKey = trend.trend_velocity || 'just_starting'
  const velocity = velocityConfig[velocityKey as keyof typeof velocityConfig] || velocityConfig['just_starting']
  const status = statusConfig[trend.status as keyof typeof statusConfig] || statusConfig['pending']
  
  const CategoryIcon = category?.icon || TrendingUpIcon
  const VelocityIcon = velocity?.icon || SparklesIcon
  const StatusIcon = status?.icon || ClockIcon

  // Format utilities
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

  // Calculate engagement score
  const getEngagementScore = () => {
    const likes = trend.likes_count || 0
    const comments = trend.comments_count || 0
    const shares = trend.shares_count || 0
    const views = trend.views_count || 0
    
    const score = (likes * 1) + (comments * 2) + (shares * 3) + (views * 0.01)
    return Math.min(100, Math.round(score / 1000))
  }

  const engagementScore = getEngagementScore()

  // Handle video preview
  useEffect(() => {
    if (isHovered && videoRef.current && trend.post_url?.includes('video')) {
      videoRef.current.play().catch(() => {})
    } else if (!isHovered && videoRef.current) {
      videoRef.current.pause()
    }
  }, [isHovered, trend.post_url])

  const tileVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        delay: animationDelay,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    hover: {
      y: -8,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  }

  const glowVariants = {
    initial: { opacity: 0 },
    hover: { 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  }

  if (viewMode === 'list') {
    return (
      <motion.div
        variants={tileVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        className="group relative"
      >
        <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-800/50 p-6 overflow-hidden">
          {/* Background gradient effect */}
          <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />
          
          <div className="relative flex items-start gap-6">
            {/* Thumbnail */}
            {(trend.thumbnail_url || trend.screenshot_url) && (
              <div className="relative w-32 h-32 rounded-xl overflow-hidden flex-shrink-0">
                <img 
                  src={trend.thumbnail_url || trend.screenshot_url || ''}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {trend.evidence?.title || trend.description.split('\n')[0]}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <CategoryIcon className="w-4 h-4" />
                      {trend.category.replace(/_/g, ' ')}
                    </span>
                    {trend.creator_handle && (
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-4 h-4" />
                        {trend.creator_handle}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      {formatDate(trend.created_at)}
                    </span>
                  </div>
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-2">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${status.color} text-white text-xs font-bold flex items-center gap-1`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {trend.status}
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={`px-3 py-1.5 rounded-full ${velocity.bgColor} ${velocity.color} text-xs font-bold flex items-center gap-1`}
                  >
                    <VelocityIcon className="w-3 h-3" />
                    {velocity.text}
                  </motion.div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-6 gap-4">
                {/* Engagement */}
                {trend.views_count && trend.views_count > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{formatEngagement(trend.views_count)}</div>
                    <div className="text-xs text-gray-500">Views</div>
                  </div>
                )}
                {trend.likes_count && trend.likes_count > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{formatEngagement(trend.likes_count)}</div>
                    <div className="text-xs text-gray-500">Likes</div>
                  </div>
                )}
                
                {/* Wave Score */}
                <div className="text-center">
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {trend.wave_score || 5}/10
                  </div>
                  <div className="text-xs text-gray-500">Wave</div>
                </div>

                {/* Validation */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg font-bold text-green-400">{trend.approve_count || 0}</span>
                    <span className="text-gray-600">/</span>
                    <span className="text-lg font-bold text-red-400">{trend.reject_count || 0}</span>
                  </div>
                  <div className="text-xs text-gray-500">Votes</div>
                </div>

                {/* Earnings */}
                {trend.bounty_amount > 0 && (
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${trend.bounty_paid ? 'text-green-400' : 'text-yellow-400'}`}>
                      {formatCurrency(trend.bounty_amount)}
                    </div>
                    <div className="text-xs text-gray-500">{trend.bounty_paid ? 'Earned' : 'Pending'}</div>
                  </div>
                )}
              </div>

              {/* Hashtags */}
              {trend.hashtags && trend.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {trend.hashtags.slice(0, 5).map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {trend.post_url && (
                <motion.a
                  href={trend.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ExternalLinkIcon className="w-5 h-5 text-white" />
                </motion.a>
              )}
              {onExpand && (
                <motion.button
                  onClick={onExpand}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ChevronRightIcon className="w-5 h-5 text-white" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // Grid/Timeline View (Card Style)
  return (
    <motion.div
      variants={tileVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{ perspective: 1000 }}
      className="group relative"
    >
      {/* Glow effect */}
      <motion.div
        variants={glowVariants}
        initial="initial"
        animate={isHovered ? "hover" : "initial"}
        className={`absolute -inset-1 bg-gradient-to-r ${category.color} rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`}
      />
      
      <motion.div
        style={{ rotateX, rotateY }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const centerX = rect.left + rect.width / 2
          const centerY = rect.top + rect.height / 2
          x.set(e.clientX - centerX)
          y.set(e.clientY - centerY)
        }}
        onMouseLeave={() => {
          x.set(0)
          y.set(0)
        }}
        className="relative bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-800/50 overflow-hidden transform-gpu"
      >
        {/* Enhanced Thumbnail Section */}
        <div className="relative h-56 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
          {(trend.thumbnail_url || trend.screenshot_url) ? (
            <>
              {/* Image with loading animation */}
              <motion.img 
                src={trend.thumbnail_url || trend.screenshot_url || ''}
                alt=""
                className="w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: imageLoaded ? 1 : 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                onLoad={() => setImageLoaded(true)}
              />
              
              {/* Animated gradient overlay */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"
                initial={{ opacity: 0.6 }}
                animate={{ opacity: isHovered ? 0.8 : 0.6 }}
                transition={{ duration: 0.3 }}
              />

              {/* Play button for video content */}
              {trend.post_url?.includes('video') && (
                <AnimatePresence>
                  {!isPlaying && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                        <PlayIcon className="w-8 h-8 text-white ml-1" />
                      </div>
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <CategoryIcon className="w-20 h-20 text-gray-700" />
              </motion.div>
            </div>
          )}

          {/* Floating badges */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            {/* Category badge with animation */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${category.bgColor} backdrop-blur-md rounded-full border ${category.borderColor}`}
            >
              <CategoryIcon className="w-4 h-4 text-white" />
              <span className="text-xs font-medium text-white">{trend.category.replace(/_/g, ' ')}</span>
            </motion.div>

            {/* Status badge */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              className={`flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${status.color} rounded-full text-white text-xs font-bold shadow-lg`}
            >
              <StatusIcon className="w-3 h-3" />
              <span className="capitalize">{trend.status}</span>
            </motion.div>
          </div>

          {/* Velocity indicator with animation */}
          <div className="absolute bottom-3 left-3">
            <motion.div
              animate={velocity.animation === 'pulse' ? { scale: [1, 1.1, 1] } :
                       velocity.animation === 'bounce' ? { y: [0, -5, 0] } :
                       velocity.animation === 'spin' ? { rotate: 360 } :
                       { opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${velocity.bgColor} backdrop-blur-md rounded-full`}
            >
              <VelocityIcon className={`w-4 h-4 ${velocity.color}`} />
              <span className={`text-xs font-bold ${velocity.color}`}>{velocity.text}</span>
            </motion.div>
          </div>

          {/* External link button */}
          {trend.post_url && (
            <motion.a
              href={trend.post_url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="absolute bottom-3 right-3 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLinkIcon className="w-4 h-4" />
            </motion.a>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5">
          {/* Creator info */}
          {(trend.creator_handle || trend.creator_name) && (
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center"
              >
                <UserIcon className="w-5 h-5 text-white" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {trend.creator_handle || trend.creator_name}
                </p>
                <p className="text-xs text-gray-400">{formatDate(trend.created_at)}</p>
              </div>
            </div>
          )}

          {/* Title */}
          <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
            {trend.evidence?.title || trend.description.split('\n')[0]}
          </h3>

          {/* Caption */}
          {trend.post_caption && (
            <p className="text-sm text-gray-400 mb-3 line-clamp-2 italic">
              "{trend.post_caption}"
            </p>
          )}

          {/* Engagement stats with icons */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {trend.views_count && trend.views_count > 0 && (
              <div className="flex items-center gap-1.5 bg-gray-800/50 rounded-lg px-2 py-1.5">
                <EyeIcon className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-gray-300">{formatEngagement(trend.views_count)}</span>
              </div>
            )}
            {trend.likes_count && trend.likes_count > 0 && (
              <div className="flex items-center gap-1.5 bg-gray-800/50 rounded-lg px-2 py-1.5">
                <HeartIcon className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-gray-300">{formatEngagement(trend.likes_count)}</span>
              </div>
            )}
            {trend.comments_count && trend.comments_count > 0 && (
              <div className="flex items-center gap-1.5 bg-gray-800/50 rounded-lg px-2 py-1.5">
                <MessageCircleIcon className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-300">{formatEngagement(trend.comments_count)}</span>
              </div>
            )}
            {trend.shares_count && trend.shares_count > 0 && (
              <div className="flex items-center gap-1.5 bg-gray-800/50 rounded-lg px-2 py-1.5">
                <ShareIcon className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-gray-300">{formatEngagement(trend.shares_count)}</span>
              </div>
            )}
          </div>

          {/* Wave Score Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Wave Score</span>
              <span className="text-xs font-bold text-white">{trend.wave_score || 5}/10</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(trend.wave_score || 5) * 10}%` }}
                transition={{ duration: 1, delay: animationDelay + 0.5 }}
                className={`h-full bg-gradient-to-r ${velocity.gradient} rounded-full`}
              />
            </div>
          </div>

          {/* Engagement Score Circle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-gray-800"
                  />
                  <motion.circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="url(#gradient)"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${engagementScore * 1.25} 125`}
                    initial={{ strokeDashoffset: 125 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 1, delay: animationDelay + 0.3 }}
                  />
                  <defs>
                    <linearGradient id="gradient">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{engagementScore}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400">Engagement</p>
                <p className="text-xs font-bold text-white">Score</p>
              </div>
            </div>

            {/* Validation votes */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-green-400">{trend.approve_count || 0}</p>
                <p className="text-xs text-gray-500">Yes</p>
              </div>
              <div className="w-px h-8 bg-gray-700" />
              <div className="text-center">
                <p className="text-lg font-bold text-red-400">{trend.reject_count || 0}</p>
                <p className="text-xs text-gray-500">No</p>
              </div>
            </div>
          </div>

          {/* Hashtags with hover effect */}
          {trend.hashtags && trend.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {trend.hashtags.slice(0, 3).map((tag, i) => (
                <motion.span
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/20 cursor-pointer transition-colors"
                >
                  #{tag}
                </motion.span>
              ))}
              {trend.hashtags.length > 3 && (
                <span className="px-2 py-1 text-xs text-gray-500">
                  +{trend.hashtags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Earnings section */}
          {trend.bounty_amount > 0 && (
            <div className="pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSignIcon className={`w-5 h-5 ${trend.bounty_paid ? 'text-green-400' : 'text-yellow-400'}`} />
                  <div>
                    <p className="text-xs text-gray-400">{trend.bounty_paid ? 'Earned' : 'Pending'}</p>
                    <p className={`text-lg font-bold ${trend.bounty_paid ? 'text-green-400' : 'text-yellow-400'}`}>
                      {formatCurrency(trend.bounty_amount)}
                    </p>
                  </div>
                </div>
                
                {/* Action button */}
                {onExpand && (
                  <motion.button
                    onClick={onExpand}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ChevronRightIcon className="w-5 h-5 text-white" />
                  </motion.button>
                )}
              </div>
            </div>
          )}

          {/* Hover detail overlay */}
          <AnimatePresence>
            {isHovered && !isCompact && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-0 left-0 right-0 p-4 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800"
              >
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-sm font-medium"
                >
                  <Activity className="w-4 h-4" />
                  View Full Analytics
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}