import { motion } from 'framer-motion';

interface Competitor {
  id: string;
  name: string;
  platform: string;
  recentActivity: string;
  trendCount: number;
  lastActive: string;
}

interface CompetitorTrackerProps {
  competitors: Competitor[];
}

export function CompetitorTracker({ competitors }: CompetitorTrackerProps) {
  return (
    <div className="space-y-3">
      {competitors.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No competitor data available</p>
      ) : (
        competitors.map((competitor, index) => (
          <motion.div
            key={competitor.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-gray-800 rounded-lg p-3 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-white">{competitor.name}</h4>
                <p className="text-xs text-gray-400">{competitor.platform}</p>
              </div>
              <span className="text-purple-400 font-semibold">
                {competitor.trendCount}
              </span>
            </div>
            <p className="text-sm text-gray-300 mb-1">{competitor.recentActivity}</p>
            <p className="text-xs text-gray-500">Active {competitor.lastActive}</p>
          </motion.div>
        ))
      )}
    </div>
  );
}