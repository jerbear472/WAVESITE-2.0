'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface UnassignedTrend {
  id: string
  title: string
  description?: string
  platform: string
  thumbnail_url?: string
  created_at: string
  earnings?: number
  performance_score?: number
  user_name?: string
}

interface UnassignedTrendsPoolProps {
  onRefresh?: () => void
}

export default function UnassignedTrendsPool({ onRefresh }: UnassignedTrendsPoolProps) {
  const [unassignedTrends, setUnassignedTrends] = useState<UnassignedTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedItem, setDraggedItem] = useState<UnassignedTrend | null>(null)

  useEffect(() => {
    fetchUnassignedTrends()
  }, [])

  const fetchUnassignedTrends = async () => {
    try {
      const response = await fetch('/api/v1/trends/unassigned', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUnassignedTrends(data.trends || [])
      }
    } catch (error) {
      console.error('Error fetching unassigned trends:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, trend: UnassignedTrend) => {
    setDraggedItem(trend)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('trendId', trend.id)
    e.dataTransfer.setData('trendData', JSON.stringify(trend))
    
    // Add visual feedback
    const target = e.target as HTMLElement
    target.style.opacity = '0.5'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement
    target.style.opacity = '1'
    setDraggedItem(null)
  }

  const platformColors = {
    tiktok: '#000000',
    instagram: '#E1306C',
    twitter: '#1DA1F2',
    youtube: '#FF0000',
    threads: '#000000'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Unassigned Trends Pool</h3>
          <p className="text-sm text-gray-600 mt-1">
            Drag trends to folders to organize them • {unassignedTrends.length} items
          </p>
        </div>
        <button
          onClick={() => {
            fetchUnassignedTrends()
            onRefresh?.()
          }}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {unassignedTrends.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No unassigned trends</h3>
          <p className="mt-1 text-sm text-gray-500">
            All trends have been organized into folders
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {unassignedTrends.map((trend) => (
            <div
              key={trend.id}
              draggable
              onDragStart={(e) => handleDragStart(e, trend)}
              onDragEnd={handleDragEnd}
              className="group relative bg-gray-50 rounded-lg p-3 cursor-move hover:bg-gray-100 transition-all hover:shadow-md border border-transparent hover:border-gray-200"
            >
              {/* Thumbnail */}
              {trend.thumbnail_url && (
                <div className="relative w-full h-24 mb-2 rounded-md overflow-hidden bg-gray-200">
                  <Image
                    src={trend.thumbnail_url}
                    alt={trend.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              
              {/* Content */}
              <div className="space-y-1">
                <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                  {trend.title}
                </h4>
                
                {trend.description && (
                  <p className="text-xs text-gray-600 line-clamp-1">
                    {trend.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: platformColors[trend.platform as keyof typeof platformColors] || '#666' }}
                    />
                    <span className="text-gray-600">{trend.platform}</span>
                  </div>
                  
                  {trend.earnings && (
                    <span className="font-medium text-green-600">
                      ${trend.earnings.toFixed(0)}
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-gray-500">
                  {formatDate(trend.created_at)}
                </div>
              </div>
              
              {/* Drag handle indicator */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 6a2 2 0 11-4 0 2 2 0 014 0zM10 12a2 2 0 11-4 0 2 2 0 014 0zM10 18a2 2 0 11-4 0 2 2 0 014 0zM18 6a2 2 0 11-4 0 2 2 0 014 0zM18 12a2 2 0 11-4 0 2 2 0 014 0zM18 18a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Drop zone hint */}
      {draggedItem && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <span className="font-medium">Tip:</span> Drop "{draggedItem.title}" on any trend folder above to organize it
        </div>
      )}
    </div>
  )
}