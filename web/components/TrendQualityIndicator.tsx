'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  Camera, 
  FileText, 
  Hash, 
  Users, 
  MapPin,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { TrendQualityMetrics } from '@/lib/trendSpotterPerformanceService';

interface Props {
  metrics: TrendQualityMetrics;
  compact?: boolean;
  showBreakdown?: boolean;
}

export const TrendQualityIndicator: React.FC<Props> = ({ 
  metrics, 
  compact = false,
  showBreakdown = true 
}) => {
  const qualityLevel = getQualityLevel(metrics.overallQuality);
  const qualityColor = getQualityColor(metrics.overallQuality);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${qualityColor.bg}`} />
        <span className={`text-sm font-medium ${qualityColor.text}`}>
          {(metrics.overallQuality * 100).toFixed(0)}%
        </span>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
      {/* Overall Quality Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Quality Score</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${qualityColor.text}`}>
            {(metrics.overallQuality * 100).toFixed(0)}%
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${qualityColor.bg} ${qualityColor.text}`}>
            {qualityLevel}
          </span>
        </div>
      </div>

      {/* Quality Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <motion.div
          className={`h-full ${qualityColor.gradient}`}
          initial={{ width: 0 }}
          animate={{ width: `${metrics.overallQuality * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {showBreakdown && (
        <div className="space-y-2 pt-2">
          <QualityItem
            label="Media"
            value={metrics.hasScreenshot || metrics.hasVideo}
            icon={<Camera className="w-4 h-4" />}
            detail={metrics.hasVideo ? "Video included" : metrics.hasScreenshot ? "Screenshot included" : "No media"}
          />
          <QualityItem
            label="Description"
            value={metrics.descriptionLength >= 50}
            icon={<FileText className="w-4 h-4" />}
            detail={`${metrics.descriptionLength} characters`}
          />
          <QualityItem
            label="Metadata"
            value={metrics.metadataCompleteness >= 0.8}
            icon={<Hash className="w-4 h-4" />}
            detail={`${(metrics.metadataCompleteness * 100).toFixed(0)}% complete`}
          />
          <QualityItem
            label="Viral Potential"
            value={metrics.viralPotential >= 0.5}
            icon={<TrendingUp className="w-4 h-4" />}
            detail={getViralPotentialLabel(metrics.viralPotential)}
          />
        </div>
      )}

      {/* Tips for improvement */}
      {metrics.overallQuality < 0.8 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Tips to improve quality:</p>
          {getImprovementTips(metrics).map((tip, index) => (
            <div key={index} className="flex items-start gap-2 text-xs text-gray-500 mb-1">
              <span>•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const QualityItem: React.FC<{
  label: string;
  value: boolean;
  icon: React.ReactNode;
  detail: string;
}> = ({ label, value, icon, detail }) => {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{detail}</span>
        {value ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : (
          <AlertCircle className="w-4 h-4 text-yellow-400" />
        )}
      </div>
    </div>
  );
};

const getQualityLevel = (score: number): string => {
  if (score >= 0.9) return 'Excellent';
  if (score >= 0.7) return 'Good';
  if (score >= 0.5) return 'Fair';
  return 'Needs Work';
};

const getQualityColor = (score: number) => {
  if (score >= 0.9) return {
    text: 'text-green-400',
    bg: 'bg-green-500/20',
    gradient: 'bg-gradient-to-r from-green-500 to-emerald-500'
  };
  if (score >= 0.7) return {
    text: 'text-blue-400',
    bg: 'bg-blue-500/20',
    gradient: 'bg-gradient-to-r from-blue-500 to-sky-500'
  };
  if (score >= 0.5) return {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    gradient: 'bg-gradient-to-r from-yellow-500 to-orange-500'
  };
  return {
    text: 'text-red-400',
    bg: 'bg-red-500/20',
    gradient: 'bg-gradient-to-r from-red-500 to-pink-500'
  };
};

const getViralPotentialLabel = (score: number): string => {
  if (score >= 0.8) return 'Very High';
  if (score >= 0.6) return 'High';
  if (score >= 0.4) return 'Moderate';
  if (score >= 0.2) return 'Low';
  return 'Very Low';
};

const getImprovementTips = (metrics: TrendQualityMetrics): string[] => {
  const tips: string[] = [];

  if (!metrics.hasScreenshot && !metrics.hasVideo) {
    tips.push('Add a screenshot or video to show the trend');
  }
  if (metrics.descriptionLength < 50) {
    tips.push('Write a more detailed description (50+ characters)');
  }
  if (metrics.metadataCompleteness < 0.8) {
    tips.push('Fill in all trend details (categories, age ranges, etc.)');
  }
  if (metrics.viralPotential < 0.5) {
    tips.push('Include engagement metrics if available');
  }

  return tips.slice(0, 3); // Show max 3 tips
};