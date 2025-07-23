import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface Insight {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: 'low' | 'medium' | 'high';
  createdAt: string;
}

interface InsightsFeedProps {
  insights: Insight[];
}

export function InsightsFeed({ insights }: InsightsFeedProps) {
  const impactColors = {
    low: 'text-green-400 bg-green-400/10',
    medium: 'text-yellow-400 bg-yellow-400/10',
    high: 'text-red-400 bg-red-400/10',
  };

  return (
    <div className="space-y-4">
      {insights.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No insights available</p>
      ) : (
        insights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-white">{insight.title}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${impactColors[insight.impact]}`}>
                {insight.impact.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-3">{insight.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="bg-gray-700 px-2 py-1 rounded">
                {insight.category?.replace(/_/g, ' ') || 'General'}
              </span>
              <span>{(() => {
                try {
                  const dateValue = insight.createdAt || (insight as any).timestamp;
                  if (!dateValue) return 'Just now';
                  const date = new Date(dateValue);
                  return !isNaN(date.getTime()) ? format(date, 'MMM d, h:mm a') : 'Just now';
                } catch {
                  return 'Just now';
                }
              })()}</span>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}