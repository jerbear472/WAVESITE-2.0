import { motion } from 'framer-motion';
import { AlertCircle, TrendingUp, Clock } from 'lucide-react';

interface Alert {
  id: string;
  type: 'emerging' | 'peaking' | 'declining';
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  predictedDate?: string;
}

interface PredictiveAlertsProps {
  alerts: Alert[];
}

export function PredictiveAlerts({ alerts }: PredictiveAlertsProps) {
  const typeIcons = {
    emerging: <TrendingUp className="w-4 h-4" />,
    peaking: <AlertCircle className="w-4 h-4" />,
    declining: <Clock className="w-4 h-4" />,
  };

  const urgencyColors = {
    low: 'border-green-500/50 bg-green-500/10',
    medium: 'border-yellow-500/50 bg-yellow-500/10',
    high: 'border-red-500/50 bg-red-500/10',
  };

  return (
    <div className="space-y-3">
      {alerts.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No active alerts</p>
      ) : (
        alerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`border rounded-lg p-4 ${urgencyColors[alert.urgency]}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{typeIcons[alert.type]}</div>
              <div className="flex-1">
                <h4 className="font-medium text-white mb-1">{alert.title}</h4>
                <p className="text-sm text-gray-300 mb-2">{alert.description}</p>
                {alert.predictedDate && (
                  <p className="text-xs text-gray-400">
                    Predicted: {new Date(alert.predictedDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}