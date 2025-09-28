'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, TrendingUpIcon, TrendingDownIcon, SparklesIcon } from './icons/TrendIcons'
import Image from 'next/image'
import { Camera as CameraIcon } from 'lucide-react'

interface TrendTileProps {
  trend: {
    id: string
    title: string
    description?: string
    waveScore: number
    category: string
    status: 'emerging' | 'trending' | 'peak' | 'declining'
    totalEarnings: number
    contentCount: number
    thumbnailUrls: string[]
    platformDistribution: Record<string, number>
    isCollaborative: boolean
    firstContentDate: string
    lastContentDate: string
    contentItems?: ContentItem[]
    sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed'
    sentimentScore?: number
    moods?: string[]
    viralityPrediction?: number
    audienceAge?: string[]
    trendVelocity?: string
    aiAngle?: string
    trendSize?: string
    creator_handle?: string
    creator_name?: string
  }
  onAddContent: (trendId: string) => void
  onContentClick: (contentId: string) => void
  onMergeTrend: (trendId: string) => void
  onSplitTrend: (trendId: string) => void
}

interface ContentItem {
  id: string
  type: 'video' | 'post' | 'story' | 'reel'
  platform: string
  thumbnailUrl: string
  title: string
  earnings: number
  performanceScore: number
  isTopPerformer: boolean
  addedAt: string
}

const platformColors = {
  tiktok: '#000000',
  instagram: '#E1306C',
  twitter: '#1DA1F2',
  youtube: '#FF0000',
  threads: '#000000'
}

const statusColors = {
  emerging: 'bg-blue-100 text-blue-800',
  trending: 'bg-green-100 text-green-800',
  peak: 'bg-yellow-100 text-yellow-800',
  declining: 'bg-red-100 text-red-800'
}

const sentimentColors = {
  positive: 'bg-emerald-100 text-emerald-800',
  negative: 'bg-red-100 text-red-800',
  neutral: 'bg-gray-100 text-gray-800',
  mixed: 'bg-purple-100 text-purple-800'
}

// Icon components for moods (subtle design)
const MoodIcon = ({ mood, className = "w-4 h-4" }: { mood: string; className?: string }) => {
  const iconMap: Record<string, JSX.Element> = {
    excited: (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100-4h2a1 1 0 100-2 2 2 0 00-2 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z"/>
      </svg>
    ),
    funny: (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z"/>
      </svg>
    ),
    inspiring: <SparklesIcon className={className} />,
    controversial: (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"/>
      </svg>
    ),
    nostalgic: (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
      </svg>
    ),
    relaxing: (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
      </svg>
    ),
    energetic: (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"/>
      </svg>
    ),
    emotional: (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
      </svg>
    ),
    informative: (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
      </svg>
    ),
    creative: (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/>
      </svg>
    ),
    corporate: (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"/>
        <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
      </svg>
    ),
    calm: (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"/>
      </svg>
    )
  };

  return iconMap[mood] || <SparklesIcon className={className} />;
}

const statusIcons = {
  emerging: SparklesIcon,
  trending: TrendingUpIcon,
  peak: SparklesIcon,
  declining: TrendingDownIcon
}

export default function TrendTile({ trend, onAddContent, onContentClick, onMergeTrend, onSplitTrend }: TrendTileProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDateRange = () => {
    const start = new Date(trend.firstContentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const end = new Date(trend.lastContentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${start} - ${end}`
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }

  const handleDragLeave = () => {
    setIsDraggingOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    
    const trendId = e.dataTransfer.getData('trendId')
    const trendDataStr = e.dataTransfer.getData('trendData')
    
    if (trendId && trendDataStr) {
      try {
        const trendData = JSON.parse(trendDataStr)
        
        // Call API to add content to this trend tile
        const response = await fetch(`/api/v1/trend-tiles/${trend.id}/content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            content_id: trendId,
            content_type: trendData.type || 'post',
            platform: trendData.platform,
            thumbnail_url: trendData.thumbnail_url,
            title: trendData.title,
            performance_score: trendData.performance_score || 0,
            earnings: trendData.earnings || 0
          })
        })
        
        if (response.ok) {
          // Trigger a refresh without full page reload if parent has a refresh function
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('trend-updated'))
          }
        } else {
          console.error('Failed to add content to trend')
        }
      } catch (error) {
        console.error('Error adding content to trend:', error)
      }
    }
  }

  const StatusIcon = statusIcons[trend.status]

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border transition-all duration-200 ${
        isDraggingOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header - Always Visible */}
      <div
        className="p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3 flex-1">
            <button className="mt-1">
              {isExpanded ? (
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRightIcon className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {trend.title && trend.title !== '0' ? trend.title.replace(/#\w+/g, '').trim() : 'Untitled Trend'}
              </h3>
                
                {/* Tags Row */}
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  {/* Status Tag */}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[trend.status]}`}>
                    <StatusIcon className="w-3 h-3 inline mr-1" />
                    {trend.status}
                  </span>
                  
                  {/* Category Tag */}
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                    {trend.category}
                  </span>
                  
                  {/* Wave Score Tag */}
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full inline-flex items-center gap-1">
                    <SparklesIcon className="w-3 h-3" />
                    Wave: {trend.waveScore * 10}/100
                  </span>
                  
                  {/* Sentiment Score Tag */}
                  {trend.sentimentScore !== undefined && (
                    <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                      Sentiment: {trend.sentimentScore}/100
                    </span>
                  )}
                  
                  {/* Sentiment Tag */}
                  {trend.sentiment && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${sentimentColors[trend.sentiment]}`}>
                      {trend.sentiment}
                    </span>
                  )}
                  
                  {/* Trend Velocity Tag */}
                  {trend.trendVelocity && (
                    <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                      🚀 {trend.trendVelocity.replace('_', ' ')}
                    </span>
                  )}
                  
                  {/* Trend Size Tag */}
                  {trend.trendSize && (
                    <span className="px-2 py-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full">
                      📏 {trend.trendSize}
                    </span>
                  )}
                  
                  {/* AI Angle Tag */}
                  {trend.aiAngle && trend.aiAngle !== 'not_ai' && (
                    <span className="px-2 py-1 text-xs font-medium bg-pink-100 text-pink-800 rounded-full">
                      🤖 {trend.aiAngle.replace(/_/g, ' ')}
                    </span>
                  )}
                  
                  {/* Audience Age Tags */}
                  {trend.audienceAge && trend.audienceAge.length > 0 && (
                    <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                      👥 {trend.audienceAge.join(', ')}
                    </span>
                  )}
                  
                  {/* Creator Tag */}
                  {trend.creator_handle && (
                    <span className="px-2 py-1 text-xs font-medium bg-violet-100 text-violet-800 rounded-full">
                      @{trend.creator_handle}
                    </span>
                  )}
                  
                  {/* Virality Prediction Tag */}
                  {trend.viralityPrediction && (
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                      Virality: {(trend.viralityPrediction * 10)}/100
                    </span>
                  )}
                  
                  {/* Mood Tags with Icons */}
                  {trend.moods && trend.moods.slice(0, 2).map((mood, index) => (
                    <span key={index} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gradient-to-r from-yellow-50 to-amber-50 text-amber-800 rounded-full border border-amber-200/50">
                      <MoodIcon mood={mood} className="w-3 h-3" />
                      <span>{mood}</span>
                    </span>
                  ))}
                </div>
              
              {trend.description && trend.description !== '0' && (
                <p className="text-sm text-gray-600 mb-3">{trend.description}</p>
              )}
              
              {/* Who's Driving This Section */}
              {(trend.audienceAge || trend.creator_name) && (
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Who's driving this: </span>
                  {trend.creator_name && <span>{trend.creator_name} </span>}
                  {trend.audienceAge && trend.audienceAge.length > 0 && (
                    <span>• Audience: {trend.audienceAge.join(', ')}</span>
                  )}
                </div>
              )}
              
              {/* Metrics Row */}
              <div className="flex items-center space-x-6 text-sm">
                
                <div>
                  <span className="font-semibold text-gray-900">{formatCurrency(trend.totalEarnings)}</span>
                  <span className="text-gray-500 ml-1">earned</span>
                </div>
                
                <div>
                  <span className="font-semibold text-gray-900">{trend.contentCount}</span>
                  <span className="text-gray-500 ml-1">items</span>
                </div>
                
                <div className="text-gray-500">
                  {formatDateRange()}
                </div>
              </div>
            </div>
          </div>
          
          {/* Preview Thumbnails with better extraction */}
          <div className="flex -space-x-2 ml-4">
            {trend.thumbnailUrls && trend.thumbnailUrls.length > 0 ? (
              trend.thumbnailUrls.slice(0, 3).map((url, index) => (
                <div
                  key={index}
                  className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-white shadow-lg hover:scale-110 transition-transform"
                  style={{ zIndex: 3 - index }}
                >
                  {url && url !== '/api/placeholder/150/150' ? (
                    <Image
                      src={url}
                      alt="Trend thumbnail"
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-trend.png';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                      <SparklesIcon className="w-6 h-6 text-purple-400" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white flex items-center justify-center">
                <CameraIcon className="w-6 h-6 text-gray-400" />
              </div>
            )}
            {trend.contentCount > 3 && (
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-white flex items-center justify-center shadow-lg">
                <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">+{trend.contentCount - 3}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Platform Distribution */}
        <div className="flex items-center space-x-4 mt-4">
          {Object.entries(trend.platformDistribution).map(([platform, count]) => (
            <div key={platform} className="flex items-center space-x-1">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: platformColors[platform as keyof typeof platformColors] }}
              />
              <span className="text-xs text-gray-600">{count}</span>
            </div>
          ))}
          {trend.isCollaborative ? (
            <div className="ml-auto flex items-center space-x-1 text-xs text-purple-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <span>Collaborative</span>
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="p-6 space-y-3">
            {trend.contentItems?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => onContentClick(item.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                    <Image
                      src={item.thumbnailUrl}
                      alt=""
                      fill
                      className="object-cover"
                    />
                    {item.isTopPerformer && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <span>{item.platform}</span>
                      <span>•</span>
                      <span>{item.type}</span>
                      <span>•</span>
                      <span>{new Date(item.addedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(item.earnings)}</div>
                  <div className="text-sm text-gray-600">Score: {item.performanceScore}</div>
                </div>
              </div>
            ))}
            
            {/* Add Content Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddContent(trend.id)
              }}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Content to Trend</span>
            </button>
          </div>
          
          {/* Action Bar */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMergeTrend(trend.id)
                }}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Merge</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSplitTrend(trend.id)
                }}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Split</span>
              </button>
            </div>
            
            <div className="text-sm text-gray-500">
              Last updated {new Date(trend.lastContentDate).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}