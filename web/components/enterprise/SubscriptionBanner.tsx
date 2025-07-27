'use client';

import { motion } from 'framer-motion';
import { Crown, Zap, Rocket, Building } from 'lucide-react';

interface SubscriptionBannerProps {
  plan: string;
}

export function SubscriptionBanner({ plan }: SubscriptionBannerProps) {
  const planDetails = {
    starter: {
      name: 'Starter',
      icon: <Zap className="w-4 h-4" />,
      color: 'from-gray-500 to-gray-600',
      features: '100 trends/month'
    },
    professional: {
      name: 'Professional',
      icon: <Crown className="w-4 h-4" />,
      color: 'from-purple-500 to-pink-500',
      features: 'Unlimited access'
    },
    enterprise: {
      name: 'Enterprise',
      icon: <Rocket className="w-4 h-4" />,
      color: 'from-cyan-500 to-blue-500',
      features: 'Custom solutions'
    },
    hedge_fund: {
      name: 'Hedge Fund',
      icon: <Building className="w-4 h-4" />,
      color: 'from-green-500 to-emerald-500',
      features: 'Microsecond data'
    }
  };

  const currentPlan = planDetails[plan as keyof typeof planDetails] || planDetails.starter;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r ${currentPlan.color} text-white`}
    >
      {currentPlan.icon}
      <div className="flex flex-col">
        <span className="text-sm font-semibold leading-tight">{currentPlan.name}</span>
        <span className="text-xs opacity-80 leading-tight">{currentPlan.features}</span>
      </div>
    </motion.div>
  );
}