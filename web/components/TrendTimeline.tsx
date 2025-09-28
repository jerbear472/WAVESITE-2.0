'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

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

interface TrendTimelineProps {
  trends: TrendTileData[]
  onTrendClick: (trendId: string) => void
  onAddContent: (trendId: string) => void
  selectedTrends?: string[]
  onSelectTrend?: (trendId: string) => void
}

const PIXELS_PER_DAY = 100 // Width of one day on the timeline
const TILE_HEIGHT = 120 // Height of trend tiles
const TIMELINE_PADDING = 50
const HEADER_HEIGHT = 60

const categoryColors = {
  Technology: '#3B82F6',
  Fashion: '#EC4899',
  Food: '#F59E0B',
  Entertainment: '#8B5CF6',
  Lifestyle: '#10B981',
  Gaming: '#EF4444',
  Education: '#6366F1',
  default: '#6B7280'
}

const platformColors = {
  tiktok: '#000000',
  instagram: '#E1306C',
  twitter: '#1DA1F2',
  youtube: '#FF0000',
  threads: '#000000'
}

const statusGradients = {
  emerging: 'from-blue-400/20 to-blue-600/30',
  trending: 'from-green-400/20 to-green-600/30',
  peak: 'from-yellow-400/20 to-yellow-600/30',
  declining: 'from-red-400/20 to-red-600/30'
}

export default function TrendTimeline({ trends, onTrendClick, onAddContent, selectedTrends = [], onSelectTrend }: TrendTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [hoveredTrend, setHoveredTrend] = useState<string | null>(null)

  // Date utility functions
  const startOfDay = (date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const endOfDay = (date: Date) => {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d
  }

  const addDays = (date: Date, days: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  const differenceInDays = (date1: Date, date2: Date) => {
    const diffTime = date1.getTime() - date2.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  const formatDate = (date: Date, format: string) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const d = new Date(date)
    
    if (format === 'MMM d') {
      return `${months[d.getMonth()]} ${d.getDate()}`
    } else if (format === 'yyyy') {
      return d.getFullYear().toString()
    }
    return d.toLocaleDateString()
  }

  // Calculate timeline bounds
  const getTimelineBounds = useCallback(() => {
    if (trends.length === 0) {
      const now = new Date()
      return {
        start: addDays(now, -30),
        end: now,
        totalDays: 30
      }
    }

    const allDates = trends.flatMap(t => [
      new Date(t.firstContentDate),
      new Date(t.lastContentDate)
    ])
    
    const start = startOfDay(new Date(Math.min(...allDates.map(d => d.getTime()))))
    const end = endOfDay(new Date(Math.max(...allDates.map(d => d.getTime()))))
    const totalDays = differenceInDays(end, start) + 1

    // Add some padding days
    return {
      start: addDays(start, -7),
      end: addDays(end, 7),
      totalDays: totalDays + 14
    }
  }, [trends])

  const { start: timelineStart, end: timelineEnd, totalDays } = getTimelineBounds()
  const timelineWidth = totalDays * PIXELS_PER_DAY * zoomLevel

  // Generate date markers
  const generateDateMarkers = () => {
    const markers = []
    const dayInterval = zoomLevel > 0.5 ? 1 : Math.ceil(1 / zoomLevel)
    
    for (let i = 0; i < totalDays; i += dayInterval) {
      const date = addDays(timelineStart, i)
      const x = i * PIXELS_PER_DAY * zoomLevel
      
      markers.push({
        date,
        x,
        label: formatDate(date, 'MMM d'),
        isMonthStart: date.getDate() === 1
      })
    }
    
    return markers
  }

  // Calculate tile position and width
  const getTilePosition = (trend: TrendTileData) => {
    const startDate = new Date(trend.firstContentDate)
    const endDate = new Date(trend.lastContentDate)
    
    const startOffset = differenceInDays(startDate, timelineStart)
    const duration = differenceInDays(endDate, startDate) + 1
    
    return {
      x: startOffset * PIXELS_PER_DAY * zoomLevel,
      width: Math.max(duration * PIXELS_PER_DAY * zoomLevel, 200), // Min width for readability
      y: 0 // Will be calculated for overlap prevention
    }
  }

  // Arrange tiles to prevent overlap
  const arrangeTiles = () => {
    const sortedTrends = [...trends].sort((a, b) => 
      new Date(a.firstContentDate).getTime() - new Date(b.firstContentDate).getTime()
    )
    
    const lanes: Array<{ endX: number }> = []
    const positions: Record<string, { x: number; y: number; width: number }> = {}
    
    sortedTrends.forEach(trend => {
      const { x, width } = getTilePosition(trend)
      
      // Find first available lane
      let laneIndex = lanes.findIndex(lane => lane.endX <= x)
      if (laneIndex === -1) {
        laneIndex = lanes.length
        lanes.push({ endX: 0 })
      }
      
      lanes[laneIndex].endX = x + width + 20 // Add gap
      positions[trend.id] = {
        x,
        y: laneIndex * (TILE_HEIGHT + 20),
        width
      }
    })
    
    return { positions, totalHeight: lanes.length * (TILE_HEIGHT + 20) }
  }

  const { positions: tilePositions, totalHeight } = arrangeTiles()

  // Scroll to today on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const today = new Date()
      const daysFromStart = differenceInDays(today, timelineStart)
      const todayPosition = daysFromStart * PIXELS_PER_DAY * zoomLevel
      const containerWidth = scrollContainerRef.current.clientWidth
      
      // Center today in view
      scrollContainerRef.current.scrollLeft = todayPosition - containerWidth / 2
    }
  }, [timelineStart, zoomLevel])

  // Mouse drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.pageX - scrollContainerRef.current!.offsetLeft)
    setScrollLeft(scrollContainerRef.current!.scrollLeft)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current!.offsetLeft
    const walk = (x - startX) * 1.5
    scrollContainerRef.current!.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom with ctrl/cmd + scroll
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoomLevel(prev => Math.max(0.3, Math.min(2, prev + delta)))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="relative bg-gray-50 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header with controls */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Timeline View</h3>
          <div className="text-sm text-gray-600">
            Scroll horizontally to navigate • Ctrl+Scroll to zoom
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.3, prev - 0.2))}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.2))}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-2" />
          
          {/* Today button */}
          <button
            onClick={() => {
              if (scrollContainerRef.current) {
                const today = new Date()
                const daysFromStart = differenceInDays(today, timelineStart)
                const todayPosition = daysFromStart * PIXELS_PER_DAY * zoomLevel
                const containerWidth = scrollContainerRef.current.clientWidth
                scrollContainerRef.current.scrollTo({
                  left: todayPosition - containerWidth / 2,
                  behavior: 'smooth'
                })
              }
            }}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
          >
            Today
          </button>
        </div>
      </div>
      
      {/* Timeline container */}
      <div
        ref={scrollContainerRef}
        className={`relative overflow-x-auto overflow-y-hidden ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ height: totalHeight + HEADER_HEIGHT + TIMELINE_PADDING * 2 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          ref={timelineRef}
          className="relative"
          style={{ 
            width: timelineWidth,
            height: totalHeight + HEADER_HEIGHT + TIMELINE_PADDING
          }}
        >
          {/* Date markers and grid */}
          <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
            {generateDateMarkers().map(({ date, x, label, isMonthStart }) => (
              <div key={x} className="absolute top-0 bottom-0" style={{ left: x }}>
                {/* Vertical grid line */}
                <div className={`absolute top-0 bottom-0 w-px ${
                  isMonthStart ? 'bg-gray-400' : 'bg-gray-200'
                }`} />
                
                {/* Date label */}
                <div className={`absolute top-0 text-xs ${
                  isMonthStart ? 'font-semibold text-gray-700' : 'text-gray-500'
                }`}>
                  <div className="px-2 py-1">{label}</div>
                  {isMonthStart && (
                    <div className="px-2 text-xs font-normal text-gray-400">
                      {formatDate(date, 'yyyy')}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Today marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{
                left: differenceInDays(new Date(), timelineStart) * PIXELS_PER_DAY * zoomLevel
              }}
            >
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                Today
              </div>
            </div>
          </div>
          
          {/* Trend tiles */}
          <div className="absolute left-0 right-0" style={{ top: HEADER_HEIGHT }}>
            {trends.map(trend => {
              const position = tilePositions[trend.id]
              if (!position) return null
              
              return (
                <div
                  key={trend.id}
                  className={`absolute cursor-pointer transition-all duration-200 ${
                    hoveredTrend === trend.id ? 'z-10' : 'z-0'
                  }`}
                  style={{
                    left: position.x,
                    top: position.y + TIMELINE_PADDING,
                    width: position.width,
                    height: TILE_HEIGHT
                  }}
                  onClick={() => onTrendClick(trend.id)}
                  onMouseEnter={() => setHoveredTrend(trend.id)}
                  onMouseLeave={() => setHoveredTrend(null)}
                >
                  <div className={`h-full rounded-xl overflow-hidden transition-all duration-300 relative group ${
                    hoveredTrend === trend.id
                      ? 'shadow-2xl scale-105 ring-2 ring-blue-400 ring-opacity-50'
                      : selectedTrends.includes(trend.id)
                      ? 'shadow-xl ring-2 ring-purple-400'
                      : 'shadow-lg hover:shadow-xl'
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${
                      categoryColors[trend.category as keyof typeof categoryColors] || categoryColors.default
                    }15, white 50%)`,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${
                      categoryColors[trend.category as keyof typeof categoryColors] || categoryColors.default
                    }30`
                  }}>
                    {/* Animated gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${
                      trend.status === 'emerging' ? 'from-blue-400/10 via-transparent to-blue-600/10' :
                      trend.status === 'trending' ? 'from-green-400/10 via-transparent to-green-600/10' :
                      trend.status === 'peak' ? 'from-yellow-400/10 via-transparent to-orange-600/10' :
                      'from-red-400/10 via-transparent to-red-600/10'
                    } opacity-60 group-hover:opacity-80 transition-opacity`} />

                    {/* Selection Checkbox */}
                    {onSelectTrend && (
                      <input
                        type="checkbox"
                        checked={selectedTrends.includes(trend.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          onSelectTrend(trend.id)
                        }}
                        className="absolute top-2 right-2 w-4 h-4 text-purple-600 rounded focus:ring-purple-500 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    )}

                    {/* Category accent bar with gradient */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5 opacity-90"
                      style={{
                        background: `linear-gradient(90deg, ${
                          categoryColors[trend.category as keyof typeof categoryColors] || categoryColors.default
                        }, ${categoryColors[trend.category as keyof typeof categoryColors] || categoryColors.default}80)`
                      }}
                    />

                    {/* Status badge */}
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm ${
                      trend.status === 'emerging' ? 'bg-blue-500/20 text-blue-700' :
                      trend.status === 'trending' ? 'bg-green-500/20 text-green-700' :
                      trend.status === 'peak' ? 'bg-yellow-500/20 text-yellow-700' :
                      'bg-red-500/20 text-red-700'
                    }`}>
                      {trend.status.toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="relative h-full p-3 flex flex-col">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 mt-4">
                          <h4 className="font-bold text-sm text-gray-900 truncate mb-1">
                            {trend.title}
                          </h4>
                          <div className="flex items-center space-x-2 text-[10px] text-gray-500">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded">{trend.category}</span>
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded">{trend.contentCount} items</span>
                          </div>
                        </div>

                        {/* Wave Score with animated ring */}
                        <div className="flex-shrink-0 ml-2">
                          <div className="relative">
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400 to-purple-600 opacity-20 blur animate-pulse" />
                            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                              {trend.waveScore}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Thumbnails with enhanced styling */}
                      <div className="flex -space-x-2 mb-2">
                        {trend.thumbnailUrls.slice(0, 4).map((url, idx) => (
                          <div
                            key={idx}
                            className="w-9 h-9 rounded-lg border-2 border-white bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden shadow-sm hover:scale-110 transition-transform"
                            style={{ zIndex: 4 - idx }}
                          >
                            {url && (
                              <img
                                src={url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                        {trend.contentCount > 4 && (
                          <div className="w-9 h-9 rounded-lg border-2 border-white bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shadow-sm">
                            +{trend.contentCount - 4}
                          </div>
                        )}
                      </div>

                      {/* Earnings with icon */}
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                            <span className="text-green-600 text-[10px]">$</span>
                          </div>
                          <div className="text-sm font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                            {formatCurrency(trend.totalEarnings)}
                          </div>
                        </div>
                        {/* Platform icons */}
                        <div className="flex -space-x-1">
                          {Object.keys(trend.platformDistribution).slice(0, 3).map((platform) => (
                            <div
                              key={platform}
                              className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                              style={{ backgroundColor: platformColors[platform as keyof typeof platformColors] }}
                            >
                              {platform[0].toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 text-xs">
        <div className="font-semibold text-gray-700 mb-2">Status</div>
        <div className="space-y-1">
          {Object.entries(statusGradients).map(([status, gradient]) => (
            <div key={status} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded bg-gradient-to-r ${gradient}`} />
              <span className="text-gray-600 capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}