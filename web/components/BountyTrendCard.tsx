'use client';

import { motion } from 'framer-motion';
import { Target, Users, DollarSign, Clock, Shield, Award } from 'lucide-react';

interface BountyInfo {
  id: string;
  title: string;
  enterprise_name?: string;
  price_per_spot: number;
  urgency_level: 'lightning' | 'rapid' | 'standard';
  expires_at: string;
  current_votes?: {
    approve: number;
    reject: number;
  };
}

interface BountyTrendCardProps {
  bountyInfo: BountyInfo | null;
  isValidating?: boolean;
}

export function BountyTrendCard({ bountyInfo, isValidating = false }: BountyTrendCardProps) {
  if (!bountyInfo) return null;

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'lightning': return 'from-yellow-500 to-orange-500';
      case 'rapid': return 'from-orange-500 to-red-500';
      case 'standard': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case 'lightning': return '⚡';
      case 'rapid': return '🔥';
      case 'standard': return '⏰';
      default: return '📍';
    }
  };

  const votesNeeded = 3;
  const approveProgress = ((bountyInfo.current_votes?.approve || 0) / votesNeeded) * 100;
  const rejectProgress = ((bountyInfo.current_votes?.reject || 0) / votesNeeded) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <div className={`bg-gradient-to-r ${getUrgencyColor(bountyInfo.urgency_level)} p-[2px] rounded-xl`}>
        <div className="bg-gray-900 rounded-xl p-4">
          {/* Bounty Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-bold text-cyan-400">BOUNTY SUBMISSION</span>
              <span className="text-2xl">{getUrgencyIcon(bountyInfo.urgency_level)}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-bold">${bountyInfo.price_per_spot}</span>
            </div>
          </div>

          {/* Bounty Title */}
          <div className="mb-3">
            <h3 className="text-white font-semibold text-sm mb-1">{bountyInfo.title}</h3>
            {bountyInfo.enterprise_name && (
              <p className="text-gray-400 text-xs">by {bountyInfo.enterprise_name}</p>
            )}
          </div>

          {/* Validation Progress */}
          {isValidating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Community Validation</span>
                <span className="text-gray-400">{votesNeeded} votes needed</span>
              </div>
              
              {/* Approve Progress */}
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-xs w-12">✓ {bountyInfo.current_votes?.approve || 0}</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${approveProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                {approveProgress >= 100 && (
                  <Shield className="w-4 h-4 text-green-400" />
                )}
              </div>

              {/* Reject Progress */}
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs w-12">✗ {bountyInfo.current_votes?.reject || 0}</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-red-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${rejectProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                {rejectProgress >= 100 && (
                  <span className="text-red-400 text-xs">Failed</span>
                )}
              </div>
            </div>
          )}

          {/* Quality Badge */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-yellow-400">3x Validation Rewards</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">
                {new Date(bountyInfo.expires_at).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Warning for validators */}
          {isValidating && (
            <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-xs text-amber-400">
                ⚠️ Bounty submissions require higher quality. Validate carefully!
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}