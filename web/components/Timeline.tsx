'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar,
  Clock,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  User,
  Hash,
  DollarSign,
  Zap,
  Award,
  BarChart,
  Sparkles
} from 'lucide-react';

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description?: string;
  category: string;
  status: 'submitted' | 'validating' | 'approved' | 'rejected' | 'viral';
  thumbnail?: string;
  url?: string;
  creator?: {
    handle?: string;
    name?: string;
    platform?: string;
  };
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
  hashtags?: string[];
  earnings?: number;
  viralityScore?: number;
  validations?: number;
}

interface TimelineProps {
  items: TimelineItem[];
  variant?: 'default' | 'compact' | 'detailed';
  showConnector?: boolean;
  animated?: boolean;
}

export default function Timeline({ 
  items, 
  variant = 'default',
  showConnector = true,
  animated = true 
}: TimelineProps) {
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'from-green-500 to-emerald-600';
      case 'viral': return 'from-purple-500 to-pink-600';
      case 'rejected': return 'from-red-500 to-rose-600';
      case 'validating': return 'from-yellow-500 to-amber-600';
      default: return 'from-blue-500 to-indigo-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Sparkles className="w-4 h-4" />;
      case 'viral': return <Zap className="w-4 h-4" />;
      case 'rejected': return <Clock className="w-4 h-4" />;
      case 'validating': return <Eye className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      'meme': '😂',
      'music': '🎵',
      'fashion': '👗',
      'food': '🍔',
      'lifestyle': '✨',
      'tech': '💻',
      'finance': '💰',
      'sports': '⚽',
      'political': '🏛️',
      'cars': '🚗',
      'animals': '🐾',
      'travel': '✈️',
      'education': '📚',
      'science': '🔬',
      'entertainment': '🎭',
      'art': '🎨',
      'relationships': '❤️',
      'health': '💪'
    };
    return emojiMap[category] || '📌';
  };

  // Group items by date for better organization
  const groupedItems = items.reduce((acc, item) => {
    const date = new Date(item.date);
    const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(item);
    return acc;
  }, {} as Record<string, TimelineItem[]>);

  if (variant === 'compact') {
    return (
      <div className="space-y-4">
        <AnimatePresence>
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={animated ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 p-4 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800 hover:border-gray-700 transition-all"
            >
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getStatusColor(item.status)}`} />
              <div className="flex-1">
                <h4 className="font-medium text-white">{item.title}</h4>
                <p className="text-sm text-gray-400">{formatDate(item.date)}</p>
              </div>
              {item.earnings && (
                <span className="text-sm font-medium text-green-400">+${item.earnings}</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="space-y-12">
        {Object.entries(groupedItems).map(([monthYear, monthItems], groupIndex) => (
          <motion.div
            key={monthYear}
            initial={animated ? { opacity: 0 } : {}}
            animate={{ opacity: 1 }}
            transition={{ delay: groupIndex * 0.1 }}
          >
            <h3 className="text-lg font-semibold text-gray-400 mb-6">{monthYear}</h3>
            <div className="space-y-8">
              {monthItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={animated ? { opacity: 0, x: -50 } : {}}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  <div className="flex gap-6">
                    {/* Date column */}
                    <div className="w-32 flex-shrink-0 text-right">
                      <p className="text-sm font-medium text-gray-400">
                        {new Date(item.date).toLocaleDateString('en-US', { 
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.date).toLocaleTimeString('en-US', { 
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {/* Connector */}
                    <div className="relative">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${getStatusColor(item.status)} shadow-lg`} />
                      {showConnector && index < monthItems.length - 1 && (
                        <div className="absolute top-4 left-1/2 w-0.5 h-full bg-gray-800 -translate-x-1/2" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-8">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-all"
                      >
                        {item.thumbnail && (
                          <div className="relative h-48 overflow-hidden">
                            <img 
                              src={item.thumbnail} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                          </div>
                        )}
                        
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                              {item.creator && (
                                <p className="text-sm text-gray-400 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {item.creator.handle || item.creator.name}
                                </p>
                              )}
                            </div>
                            <div className={`flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r ${getStatusColor(item.status)} text-white text-xs font-medium`}>
                              {getStatusIcon(item.status)}
                              <span className="capitalize">{item.status}</span>
                            </div>
                          </div>

                          {item.description && (
                            <p className="text-gray-400 mb-4">{item.description}</p>
                          )}

                          {item.engagement && Object.values(item.engagement).some(v => v && v > 0) && (
                            <div className="flex items-center gap-4 mb-4">
                              {item.engagement.likes && item.engagement.likes > 0 && (
                                <span className="flex items-center gap-1 text-sm text-gray-400">
                                  <Heart className="w-4 h-4 text-red-400" />
                                  {formatNumber(item.engagement.likes)}
                                </span>
                              )}
                              {item.engagement.comments && item.engagement.comments > 0 && (
                                <span className="flex items-center gap-1 text-sm text-gray-400">
                                  <MessageCircle className="w-4 h-4 text-blue-400" />
                                  {formatNumber(item.engagement.comments)}
                                </span>
                              )}
                              {item.engagement.shares && item.engagement.shares > 0 && (
                                <span className="flex items-center gap-1 text-sm text-gray-400">
                                  <Share2 className="w-4 h-4 text-green-400" />
                                  {formatNumber(item.engagement.shares)}
                                </span>
                              )}
                              {item.engagement.views && item.engagement.views > 0 && (
                                <span className="flex items-center gap-1 text-sm text-gray-400">
                                  <Eye className="w-4 h-4 text-purple-400" />
                                  {formatNumber(item.engagement.views)}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-400 flex items-center gap-1">
                                <span className="text-lg">{getCategoryEmoji(item.category)}</span>
                                {item.category.replace(/_/g, ' ')}
                              </span>
                              {item.viralityScore && (
                                <span className="text-sm text-gray-400 flex items-center gap-1">
                                  <BarChart className="w-4 h-4 text-yellow-400" />
                                  {item.viralityScore}/10
                                </span>
                              )}
                            </div>
                            {item.earnings && (
                              <span className="text-sm font-medium text-green-400">
                                +${item.earnings}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Default variant
  return (
    <div className="relative">
      {/* Timeline line */}
      {showConnector && (
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-600/50 via-purple-600/50 to-transparent" />
      )}
      
      <div className="space-y-8">
        <AnimatePresence>
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={animated ? { opacity: 0, x: -50 } : {}}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex items-start gap-6"
            >
              {/* Timeline node */}
              <div className="relative z-10">
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  className={`w-16 h-16 rounded-full bg-gradient-to-br ${getStatusColor(item.status)} flex items-center justify-center shadow-lg`}
                >
                  <span className="text-2xl">{getCategoryEmoji(item.category)}</span>
                </motion.div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(item.date)}
                  </span>
                </div>
              </div>

              {/* Content card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex-1 bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-all"
              >
                <div className="flex">
                  {item.thumbnail && (
                    <div className="relative w-48 h-full flex-shrink-0">
                      <img 
                        src={item.thumbnail} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      {item.url && (
                        <a 
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <ExternalLink className="w-6 h-6 text-white" />
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {item.title}
                        </h3>
                        {item.creator && (
                          <p className="text-sm text-gray-400">
                            by {item.creator.handle || item.creator.name}
                          </p>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(item.status)} rounded-full text-white text-xs font-semibold`}>
                        {getStatusIcon(item.status)}
                        <span className="capitalize">{item.status}</span>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-sm text-gray-400 mb-3">{item.description}</p>
                    )}

                    {item.engagement && Object.values(item.engagement).some(v => v && v > 0) && (
                      <div className="flex items-center gap-4 mb-3">
                        {item.engagement.likes && item.engagement.likes > 0 && (
                          <span className="flex items-center gap-1 text-sm text-gray-400">
                            <Heart className="w-4 h-4 text-red-400" />
                            {formatNumber(item.engagement.likes)}
                          </span>
                        )}
                        {item.engagement.comments && item.engagement.comments > 0 && (
                          <span className="flex items-center gap-1 text-sm text-gray-400">
                            <MessageCircle className="w-4 h-4 text-blue-400" />
                            {formatNumber(item.engagement.comments)}
                          </span>
                        )}
                        {item.engagement.shares && item.engagement.shares > 0 && (
                          <span className="flex items-center gap-1 text-sm text-gray-400">
                            <Share2 className="w-4 h-4 text-green-400" />
                            {formatNumber(item.engagement.shares)}
                          </span>
                        )}
                        {item.engagement.views && item.engagement.views > 0 && (
                          <span className="flex items-center gap-1 text-sm text-gray-400">
                            <Eye className="w-4 h-4 text-purple-400" />
                            {formatNumber(item.engagement.views)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {item.hashtags?.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      {item.earnings && (
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                          <DollarSign className="w-4 h-4" />
                          <span>{item.earnings}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}