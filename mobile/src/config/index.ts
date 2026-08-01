export { supabase } from './supabase';

// App configuration
export const config = {
  // API endpoints
  api: {
    baseUrl: process.env.API_URL || 'https://api.wavesight.io',
    timeout: 30000,
  },

  // Feature flags
  features: {
    enableAlerts: true,
    enableExports: true,
    enableApiAccess: true,
    enableSlackIntegration: false,
  },

  // Default filter values
  defaults: {
    signalLimit: 50,
    minMomentumScore: 0,
    defaultTimePeriod: '30d' as const,
  },

  // Refresh intervals (in milliseconds)
  refresh: {
    signals: 5 * 60 * 1000, // 5 minutes
    accuracy: 15 * 60 * 1000, // 15 minutes
    alerts: 1 * 60 * 1000, // 1 minute
  },
};
