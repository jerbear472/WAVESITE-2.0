'use client'

import { useState, useEffect } from 'react'
import TrendTile from './TrendTile'
import TrendTimeline from './TrendTimeline'
import UnassignedTrendsPool from './UnassignedTrendsPool'
import { PlusIcon, FunnelIcon, ViewColumnsIcon, Squares2X2Icon } from './icons/TrendIcons'

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
}

export default function TrendTilesGrid() {
  const [trends, setTrends] = useState<TrendTileData[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'timeline'>('grid')
  const [sortBy, setSortBy] = useState<'wave_score' | 'earnings' | 'recent' | 'content_count'>('wave_score')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const categories = ['all', 'Technology', 'Fashion', 'Food', 'Entertainment', 'Lifestyle', 'Gaming', 'Education']
  const statuses = ['all', 'emerging', 'trending', 'peak', 'declining']

  // Mock data for demonstration
  useEffect(() => {
    setTrends([
      {
        id: '1',
        title: 'AI-Generated Art Movement',
        description: 'The rise of AI tools in creative content',
        waveScore: 92,
        category: 'Technology',
        status: 'trending',
        totalEarnings: 4580,
        contentCount: 18,
        thumbnailUrls: ['/api/placeholder/150/150', '/api/placeholder/150/150', '/api/placeholder/150/150'],
        platformDistribution: { tiktok: 10, instagram: 5, twitter: 3 },
        isCollaborative: true,
        firstContentDate: '2025-01-15',
        lastContentDate: '2025-01-26',
        contentItems: []
      },
      {
        id: '2',
        title: 'Clean Girl Aesthetic',
        description: 'Minimalist fashion and lifestyle trend',
        waveScore: 78,
        category: 'Fashion',
        status: 'peak',
        totalEarnings: 3200,
        contentCount: 12,
        thumbnailUrls: ['/api/placeholder/150/150', '/api/placeholder/150/150'],
        platformDistribution: { instagram: 8, tiktok: 4 },
        isCollaborative: false,
        firstContentDate: '2025-01-10',
        lastContentDate: '2025-01-25'
      },
      {
        id: '3',
        title: 'Protein Coffee Recipes',
        description: 'High-protein coffee drinks and alternatives',
        waveScore: 65,
        category: 'Food',
        status: 'emerging',
        totalEarnings: 1890,
        contentCount: 8,
        thumbnailUrls: ['/api/placeholder/150/150', '/api/placeholder/150/150', '/api/placeholder/150/150'],
        platformDistribution: { tiktok: 5, youtube: 3 },
        isCollaborative: false,
        firstContentDate: '2025-01-20',
        lastContentDate: '2025-01-26'
      },
      {
        id: '4',
        title: 'Retro Gaming Renaissance',
        description: 'Classic games making a comeback',
        waveScore: 84,
        category: 'Gaming',
        status: 'trending',
        totalEarnings: 5200,
        contentCount: 22,
        thumbnailUrls: ['/api/placeholder/150/150', '/api/placeholder/150/150'],
        platformDistribution: { youtube: 12, tiktok: 10 },
        isCollaborative: false,
        firstContentDate: '2024-12-15',
        lastContentDate: '2025-01-20'
      },
      {
        id: '5',
        title: 'DIY Home Automation',
        description: 'Smart home projects on a budget',
        waveScore: 71,
        category: 'Technology',
        status: 'emerging',
        totalEarnings: 2800,
        contentCount: 9,
        thumbnailUrls: ['/api/placeholder/150/150'],
        platformDistribution: { youtube: 7, instagram: 2 },
        isCollaborative: true,
        firstContentDate: '2025-01-05',
        lastContentDate: '2025-01-18'
      }
    ])
  }, [])

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
        {sortedAndFilteredTrends.length === 0 && (
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
        
        {/* Unassigned Trends Pool */}
        <div className="mt-8">
          <UnassignedTrendsPool onRefresh={() => window.location.reload()} />
        </div>
      </div>
    </div>
  )
}