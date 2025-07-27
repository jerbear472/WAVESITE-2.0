'use client';

import { ReactNode } from 'react';
import { useRequireEnterpriseAccess, useEnterpriseAccess } from '@/hooks/useEnterpriseAccess';
import { motion } from 'framer-motion';
import { Crown, Zap, Building2, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface EnterpriseLayoutWrapperProps {
  children: ReactNode;
  requiresFeature?: string;
  fallbackContent?: ReactNode;
}

export function EnterpriseLayoutWrapper({ 
  children, 
  requiresFeature,
  fallbackContent 
}: EnterpriseLayoutWrapperProps) {
  const { hasAccess, loading } = useRequireEnterpriseAccess();
  const { tier, features } = useEnterpriseAccess();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Show upgrade prompt if no access
  if (!hasAccess) {
    return <EnterpriseUpgradePrompt />;
  }

  // Check specific feature access
  if (requiresFeature && !features[requiresFeature as keyof typeof features]) {
    return fallbackContent || <FeatureUpgradePrompt feature={requiresFeature} currentTier={tier} />;
  }

  return <>{children}</>;
}

function EnterpriseUpgradePrompt() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl text-center"
      >
        <div className="mb-8">
          <Building2 className="w-24 h-24 mx-auto text-cyan-400 mb-4" />
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Enterprise Dashboard
          </h1>
          <p className="text-xl text-gray-400">
            Unlock powerful analytics, insights, and tools for your business
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
            <TrendingUp className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="font-semibold mb-2">Real-time Analytics</h3>
            <p className="text-sm text-gray-400">
              Advanced trend analysis and predictive insights
            </p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
            <Zap className="w-8 h-8 text-yellow-400 mb-3" />
            <h3 className="font-semibold mb-2">Smart Alerts</h3>
            <p className="text-sm text-gray-400">
              Custom notifications and automated triggers
            </p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
            <Crown className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="font-semibold mb-2">API Access</h3>
            <p className="text-sm text-gray-400">
              Integrate trend data into your systems
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href="/pricing"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Crown className="w-5 h-5 mr-2" />
            Upgrade to Enterprise
          </Link>
          
          <div className="text-sm text-gray-500">
            Starting at $1,999/month • 14-day free trial
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureUpgradePrompt({ feature, currentTier }: { feature: string; currentTier: string | null }) {
  const getUpgradeInfo = (feature: string) => {
    switch (feature) {
      case 'industryTools':
        return {
          title: 'Industry-Specific Tools',
          description: 'Access specialized dashboards for marketing agencies, hedge funds, and content creators',
          requiredTier: 'Enterprise',
          icon: <Building2 className="w-12 h-12" />
        };
      case 'customML':
        return {
          title: 'Custom ML Models',
          description: 'Train custom machine learning models for your specific use cases',
          requiredTier: 'Enterprise',
          icon: <Crown className="w-12 h-12" />
        };
      case 'hedgeFundFeatures':
        return {
          title: 'Hedge Fund Features',
          description: 'Microsecond data delivery, trading algorithms, and compliance tools',
          requiredTier: 'Hedge Fund',
          icon: <TrendingUp className="w-12 h-12" />
        };
      default:
        return {
          title: 'Premium Feature',
          description: 'This feature requires a higher subscription tier',
          requiredTier: 'Professional',
          icon: <Zap className="w-12 h-12" />
        };
    }
  };

  const info = getUpgradeInfo(feature);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md text-center bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-800"
      >
        <div className="text-cyan-400 mb-4">
          {info.icon}
        </div>
        
        <h2 className="text-2xl font-bold mb-4">{info.title}</h2>
        <p className="text-gray-400 mb-6">{info.description}</p>
        
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-500 mb-1">Current Plan</div>
          <div className="capitalize font-semibold">{currentTier || 'Starter'}</div>
          <div className="text-sm text-gray-500 mt-2 mb-1">Required Plan</div>
          <div className="font-semibold text-cyan-400">{info.requiredTier}</div>
        </div>
        
        <Link
          href="/pricing"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Upgrade Now
        </Link>
      </motion.div>
    </div>
  );
}