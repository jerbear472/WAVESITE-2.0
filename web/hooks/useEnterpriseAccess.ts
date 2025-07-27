import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface EnterpriseAccessLevel {
  hasAccess: boolean;
  tier: string | null;
  features: {
    trends: boolean;
    analytics: boolean;
    alerts: boolean;
    api: boolean;
    export: boolean;
    industryTools: boolean;
    customML: boolean;
    whiteLabel: boolean;
    hedgeFundFeatures: boolean;
  };
}

export function useEnterpriseAccess(): EnterpriseAccessLevel {
  const { user } = useAuth();
  
  const tier = user?.subscription_tier || 'starter';
  const hasAccess = ['professional', 'enterprise', 'hedge_fund'].includes(tier);

  const features = {
    // Basic features (Professional+)
    trends: hasAccess,
    analytics: hasAccess,
    alerts: hasAccess,
    
    // Advanced features (Professional+)
    api: hasAccess,
    export: hasAccess,
    
    // Enterprise features
    industryTools: ['enterprise', 'hedge_fund'].includes(tier),
    customML: ['enterprise', 'hedge_fund'].includes(tier),
    whiteLabel: ['enterprise', 'hedge_fund'].includes(tier),
    
    // Hedge fund only
    hedgeFundFeatures: tier === 'hedge_fund'
  };

  return {
    hasAccess,
    tier,
    features
  };
}

export function useRequireEnterpriseAccess(redirectTo: string = '/pricing') {
  const { hasAccess } = useEnterpriseAccess();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !hasAccess) {
      router.push(redirectTo);
    }
  }, [hasAccess, loading, router, redirectTo]);

  return { hasAccess, loading };
}

// Helper to check specific feature access
export function hasFeatureAccess(feature: keyof EnterpriseAccessLevel['features'], user: any): boolean {
  const tier = user?.subscription_tier || 'starter';
  
  switch (feature) {
    case 'trends':
    case 'analytics':
    case 'alerts':
    case 'api':
    case 'export':
      return ['professional', 'enterprise', 'hedge_fund'].includes(tier);
    
    case 'industryTools':
    case 'customML':
    case 'whiteLabel':
      return ['enterprise', 'hedge_fund'].includes(tier);
    
    case 'hedgeFundFeatures':
      return tier === 'hedge_fund';
    
    default:
      return false;
  }
}

// Pricing tier display names
export const tierDisplayNames = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
  hedge_fund: 'Hedge Fund'
};

// Feature descriptions for upgrade prompts
export const featureDescriptions = {
  trends: 'Access unlimited trend data',
  analytics: 'Advanced analytics and insights',
  alerts: 'Custom alerts and notifications',
  api: 'API access for integration',
  export: 'Data export in multiple formats',
  industryTools: 'Industry-specific tools and dashboards',
  customML: 'Custom machine learning models',
  whiteLabel: 'White-label solutions',
  hedgeFundFeatures: 'Specialized hedge fund features'
};