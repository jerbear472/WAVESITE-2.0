'use client'

import { useState, useEffect } from 'react'
import TrendTile from './TrendTile'
import TrendTimeline from './TrendTimeline'
// UnassignedTrendsPool removed - deprecated feature
import { PlusIcon, FunnelIcon, ViewColumnsIcon, Squares2X2Icon } from './icons/TrendIcons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getTrendThumbnailUrl, getTrendTitle } from '@/utils/trendHelpers'

interface TrendTileData {
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
  contentItems?: any[]
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed'
  moods?: string[]
  viralityPrediction?: number
}

export default function TrendTilesGrid() {
  const { userId } = useAuth()
  const [trends, setTrends] = useState<TrendTileData[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'timeline'>('grid')
  const [sortBy, setSortBy] = useState<'wave_score' | 'earnings' | 'recent' | 'content_count'>('wave_score')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(true)

  const categories = ['all', 'Technology', 'Fashion', 'Food', 'Entertainment', 'Lifestyle', 'Gaming', 'Education']
  const statuses = ['all', 'emerging', 'trending', 'peak', 'declining']

  // Fetch real trend data from database
  useEffect(() => {
    fetchTrends()
  }, [userId])

  const fetchTrends = async () => {
    try {
      setLoading(true)

      // Fetch trends from database
      const { data, error } = await supabase
        .from('trends')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // Transform database trends to TrendTileData format
      const transformedTrends = (data || []).map(trend => {
        // Extract thumbnail URL properly
        const thumbnailUrl = getTrendThumbnailUrl(trend)
        const thumbnailUrls = thumbnailUrl ? [thumbnailUrl] : []

        // Get clean title without hashtags
        const title = trend.title || trend.trend_name || getTrendTitle(trend)
        const cleanTitle = title.replace(/#\w+/g, '').trim()

        // Determine status based on trend data
        const getStatus = () => {
          if (trend.stage === 'viral' || trend.stage === 'peaked') return 'peak'
          if (trend.stage === 'trending') return 'trending'
          if (trend.stage === 'declining') return 'declining'
          return 'emerging'
        }

        // Parse platform from URL or metadata
        const getPlatform = () => {
          const url = trend.post_url || trend.url || ''
          if (url.includes('tiktok')) return 'tiktok'
          if (url.includes('instagram')) return 'instagram'
          if (url.includes('youtube') || url.includes('youtu.be')) return 'youtube'
          if (url.includes('twitter') || url.includes('x.com')) return 'twitter'
          return trend.platform || 'tiktok'
        }

        // Extract moods from AI analysis or sentiment
        const getMoods = () => {
          const moods = []
          if (trend.sentiment === 'positive') moods.push('inspiring')
          if (trend.sentiment === 'negative') moods.push('controversial')
          if (trend.virality_prediction > 7) moods.push('viral')
          if (trend.category === 'Technology') moods.push('innovative')
          if (trend.category === 'Entertainment') moods.push('funny')
          return moods.length > 0 ? moods : ['trending']
        }

        return {
          id: trend.id,
          title: cleanTitle,
          description: trend.description || trend.explanation || '',
          waveScore: trend.wave_score || trend.quality_score || 50,
          category: trend.category || 'General',
          status: getStatus() as any,
          totalEarnings: trend.xp_amount || 0,
          contentCount: 1,
          thumbnailUrls,
          platformDistribution: { [getPlatform()]: 1 },
          isCollaborative: false,
          firstContentDate: trend.created_at,
          lastContentDate: trend.validated_at || trend.created_at,
          contentItems: [],
          sentiment: trend.sentiment as any,
          sentimentScore: trend.sentiment_score,
          moods: getMoods(),
          viralityPrediction: trend.virality_prediction,
          audienceAge: trend.audience_age || [],
          trendVelocity: trend.trend_velocity,
          aiAngle: trend.ai_angle,
          trendSize: trend.trend_size,
          creator_handle: trend.creator_handle,
          creator_name: trend.creator_name
        }
      })

      setTrends(transformedTrends)
    } catch (error) {
      console.error('Error fetching trends:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNewTrend = () => {
    setIsCreatingNew(true)
    // Would open a modal or navigate to creation flow
  }

  const handleAddContent = (trendId: string) => {
    console.log('Adding content to trend:', trendId)
    // Would open content picker or upload flow
  }

  const handleContentClick = (contentId: string) => {
    console.log('Opening content:', contentId)
    // Would navigate to content detail view
  }

  const handleMergeTrend = (trendId: string) => {
    console.log('Merging trend:', trendId)
    // Would open merge modal
  }

  const handleSplitTrend = (trendId: string) => {
    console.log('Splitting trend:', trendId)
    // Would open split modal
  }

  const sortedAndFilteredTrends = trends
    .filter(trend => filterCategory === 'all' || trend.category === filterCategory)
    .filter(trend => filterStatus === 'all' || trend.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'wave_score':
          return b.waveScore - a.waveScore
        case 'earnings':
          return b.totalEarnings - a.totalEarnings
        case 'recent':
          return new Date(b.lastContentDate).getTime() - new Date(a.lastContentDate).getTime()
        case 'content_count':
          return b.contentCount - a.contentCount
        default:
          return 0
      }
    })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Trend Dashboard</h1>
                <p className="text-sm text-gray-600 mt-1">Organize and track your content trends</p>
              </div>
              
              <button
                onClick={handleCreateNewTrend}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span>New Trend</span>
              </button>
            </div>
            
            {/* Filters and View Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                
                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
                
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="wave_score">Wave Score</option>
                  <option value="earnings">Earnings</option>
                  <option value="recent">Recent Activity</option>
                  <option value="content_count">Content Count</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    showSuggestions ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  AI Suggestions {showSuggestions ? 'On' : 'Off'}
                </button>
                
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                    title="Grid view"
                  >
                    <Squares2X2Icon className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                    title="List view"
                  >
                    <ViewColumnsIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`p-1.5 ${viewMode === 'timeline' ? 'bg-gray-100' : ''}`}
                    title="Timeline view"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Suggestions Banner */}
      {showSuggestions && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="bg-blue-100 rounded-full p-1">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-blue-800">
                  <span className="font-medium">AI found 3 pieces of content</span> that might belong to existing trends
                </p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Review Suggestions
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && (
        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Total Trends</p>
            <p className="text-2xl font-bold text-gray-900">{trends.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Total Content</p>
            <p className="text-2xl font-bold text-gray-900">
              {trends.reduce((sum, t) => sum + t.contentCount, 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="text-2xl font-bold text-gray-900">
              ${trends.reduce((sum, t) => sum + t.totalEarnings, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Avg Wave Score</p>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(trends.reduce((sum, t) => sum + t.waveScore, 0) / trends.length)}
            </p>
          </div>
        </div>
        
        {/* Trend Tiles or Timeline */}
        {viewMode === 'timeline' ? (
          <TrendTimeline
            trends={sortedAndFilteredTrends}
            onTrendClick={(trendId) => console.log('Open trend:', trendId)}
            onAddContent={handleAddContent}
          />
        ) : (
          <div className={`${
            viewMode === 'grid' 
              ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' 
              : 'space-y-4'
          }`}>
            {sortedAndFilteredTrends.map(trend => (
              <TrendTile
                key={trend.id}
                trend={trend}
                onAddContent={handleAddContent}
                onContentClick={handleContentClick}
                onMergeTrend={handleMergeTrend}
                onSplitTrend={handleSplitTrend}
              />
            ))}
          </div>
        )}
        
        {/* Empty State */}
        {!loading && sortedAndFilteredTrends.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No trends found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or create a new trend to get started.
            </p>
            <button
              onClick={handleCreateNewTrend}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create New Trend
            </button>
          </div>
        )}

        {/* Unassigned Trends Pool - deprecated feature removed */}
        )}
      </div>
    </div>
  )
}