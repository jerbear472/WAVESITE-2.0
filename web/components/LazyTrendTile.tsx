'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { useLazyLoad } from '@/hooks/useIntersectionObserver'
import EnhancedTrendTile from './EnhancedTrendTile'
import { TrendingUp as TrendingUpIcon } from 'lucide-react'

interface LazyTrendTileProps {
  trend: any
  animationDelay?: number
  viewMode?: 'grid' | 'list' | 'timeline'
  isCompact?: boolean
  onExpand?: () => void
}

const LazyTrendTile = memo(({ 
  trend, 
  animationDelay = 0, 
  viewMode = 'grid',
  isCompact = false,
  onExpand 
}: LazyTrendTileProps) => {
  const { ref, isVisible } = useLazyLoad();

  return (
    <div ref={ref} className="relative">
      {!isVisible ? (
        // Skeleton loader while not visible
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`${
            viewMode === 'list' 
              ? 'h-40 bg-gray-800/50 rounded-2xl'
              : 'h-96 bg-gray-800/50 rounded-2xl'
          } animate-pulse`}
        >
          <div className="flex items-center justify-center h-full">
            <TrendingUpIcon className="w-8 h-8 text-gray-700 animate-pulse" />
          </div>
        </motion.div>
      ) : (
        // Actual trend tile when visible
        <EnhancedTrendTile
          trend={trend}
          animationDelay={animationDelay}
          viewMode={viewMode}
          isCompact={isCompact}
          onExpand={onExpand}
        />
      )}
    </div>
  );
});

LazyTrendTile.displayName = 'LazyTrendTile';

export default LazyTrendTile;