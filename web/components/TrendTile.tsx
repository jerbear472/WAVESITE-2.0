'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, TrendingUpIcon, TrendingDownIcon, SparklesIcon } from './icons/TrendIcons'
import Image from 'next/image'

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
    moods?: string[]
    viralityPrediction?: number
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

const moodEmojis: Record<string, string> = {
  excited: '🎉',
  funny: '😂',
  inspiring: '✨',
  controversial: '🔥',
  nostalgic: '💭',
  relaxing: '😌',
  energetic: '⚡',
  emotional: '❤️',
  informative: '📚',
  creative: '🎨',
  corporate: '💼',
  calm: '🧘'
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{trend.title}</h3>
                
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
                  
                  {/* Sentiment Tag */}
                  {trend.sentiment && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${sentimentColors[trend.sentiment]}`}>
                      {trend.sentiment}
                    </span>
                  )}
                  
                  {/* Virality Prediction Tag */}
                  {trend.viralityPrediction && (
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                      Virality: {(trend.viralityPrediction * 10)}/100
                    </span>
                  )}
                  
                  {/* Mood Tags */}
                  {trend.moods && trend.moods.slice(0, 2).map((mood, index) => (
                    <span key={index} className="px-2 py-1 text-xs font-medium bg-yellow-50 text-yellow-800 rounded-full">
                      {moodEmojis[mood] || '•'} {mood}
                    </span>
                  ))}
                </div>
              
              {trend.description && (
                <p className="text-sm text-gray-600 mb-3">{trend.description}</p>
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
          
          {/* Preview Thumbnails */}
          <div className="flex -space-x-2 ml-4">
            {trend.thumbnailUrls.slice(0, 3).map((url, index) => (
              <div
                key={index}
                className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-white"
                style={{ zIndex: 3 - index }}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
            ))}
            {trend.contentCount > 3 && (
              <div className="w-16 h-16 rounded-lg bg-gray-100 border-2 border-white flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">+{trend.contentCount - 3}</span>
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
          {trend.isCollaborative && (
            <div className="ml-auto flex items-center space-x-1 text-xs text-purple-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <span>Collaborative</span>
            </div>
          )}
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