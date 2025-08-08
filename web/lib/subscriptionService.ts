import { supabase } from './supabase';

export type SubscriptionTier = 'free' | 'core' | 'professional' | 'enterprise';

export interface SubscriptionFeatures {
  trends_per_month: number | 'unlimited';
  categories: string[];
  diffusion_tracking: 'none' | 'basic' | 'advanced';
  regional_data: string;
  user_seats: number | 'unlimited';
  export_formats: string[];
  support: string;
  api_access: boolean;
  custom_tags: boolean;
  historical_data: string;
  predictive_alerts: boolean;
  white_label: boolean;
  real_time_feed?: boolean;
  persona_deep_dives?: boolean;
  custom_persona_clusters?: boolean;
  ai_predictions?: boolean;
  custom_scout_commissions?: boolean;
}

export interface SubscriptionLimits {
  api_calls_per_hour: number;
  export_limit_per_month: number | 'unlimited';
  trends_per_export: number | 'unlimited';
  custom_personas: number | 'unlimited';
  saved_searches: number | 'unlimited';
}

export interface UserSubscription {
  id: string;
  user_id: string;
  tier_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  tier?: {
    name: SubscriptionTier;
    display_name: string;
    features: SubscriptionFeatures;
    limits: SubscriptionLimits;
  };
}

class SubscriptionService {
  private static instance: SubscriptionService;
  private userSubscriptionCache: Map<string, { subscription: UserSubscription | null; timestamp: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    // Check cache first
    const cached = this.userSubscriptionCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.subscription;
    }

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          tier:subscription_tiers (
            name,
            display_name,
            features,
            limits
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      // Cache the result
      this.userSubscriptionCache.set(userId, {
        subscription: data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('Error in getUserSubscription:', error);
      return null;
    }
  }

  async getUserTier(userId: string): Promise<SubscriptionTier> {
    const subscription = await this.getUserSubscription(userId);
    return subscription?.tier?.name || 'free';
  }

  async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription || !subscription.tier) return false;

    const features = subscription.tier.features;
    return features.hasOwnProperty(feature) && features[feature as keyof SubscriptionFeatures] !== false;
  }

  async checkLimit(userId: string, limitType: keyof SubscriptionLimits): Promise<number | 'unlimited'> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription || !subscription.tier) return 0;

    return subscription.tier.limits[limitType];
  }

  async logFeatureAccess(
    userId: string,
    feature: string,
    accessType: 'view' | 'export' | 'api_call',
    metadata?: any
  ): Promise<void> {
    try {
      await supabase.from('feature_access_log').insert({
        user_id: userId,
        feature_name: feature,
        access_type: accessType,
        metadata: metadata || {}
      });
    } catch (error) {
      console.error('Error logging feature access:', error);
    }
  }

  getTierDisplayInfo(tier: SubscriptionTier): {
    name: string;
    color: string;
    icon: string;
    badge: string;
  } {
    const tierInfo = {
      free: {
        name: 'Free',
        color: 'gray',
        icon: '🆓',
        badge: 'bg-gray-100 text-gray-800'
      },
      core: {
        name: 'WaveSight Core',
        color: 'blue',
        icon: '🔷',
        badge: 'bg-blue-100 text-blue-800'
      },
      professional: {
        name: 'WaveSight Pro',
        color: 'purple',
        icon: '💎',
        badge: 'bg-purple-100 text-purple-800'
      },
      enterprise: {
        name: 'WaveSight Apex',
        color: 'gold',
        icon: '👑',
        badge: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
      }
    };

    return tierInfo[tier] || tierInfo.free;
  }

  getCategoryList(tier: SubscriptionTier): string[] {
    const categories = {
      free: [],
      core: ['fashion', 'food', 'memes', 'music', 'tech'],
      professional: [
        'fashion', 'food', 'memes', 'music', 'tech', 
        'sports', 'beauty', 'automotive', 'wellness', 
        'entertainment', 'finance', 'health', 'travel', 'lifestyle'
      ],
      enterprise: [
        'fashion', 'food', 'memes', 'music', 'tech',
        'sports', 'beauty', 'automotive', 'wellness',
        'entertainment', 'finance', 'health', 'travel',
        'lifestyle', 'gaming', 'education', 'real_estate',
        'crypto', 'sustainability', 'politics', 'art',
        'science', 'business', 'social_causes'
      ]
    };

    return categories[tier] || categories.free;
  }

  getTrendLimit(tier: SubscriptionTier): number | 'unlimited' {
    const limits = {
      free: 0,
      core: 10,
      professional: 'unlimited' as const,
      enterprise: 'unlimited' as const
    };

    return limits[tier] || 0;
  }

  clearCache(userId?: string): void {
    if (userId) {
      this.userSubscriptionCache.delete(userId);
    } else {
      this.userSubscriptionCache.clear();
    }
  }
}

export const subscriptionService = SubscriptionService.getInstance();