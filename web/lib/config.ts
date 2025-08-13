// Application configuration
// Centralized configuration management

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || (isProduction 
      ? 'https://api.wavesight.com' 
      : 'http://localhost:8000'),
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aicahushpcslwjwrlqbo.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },

  // Application Settings
  app: {
    name: 'WaveSight',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || (isProduction 
      ? 'https://wavesight.com' 
      : 'http://localhost:3000'),
  },

  // Feature Flags
  features: {
    enableEmailConfirmation: isProduction,
    enableErrorMonitoring: true,
    enableAnalytics: isProduction,
    enableDebugMode: isDevelopment,
    enableMaintenanceMode: false,
  },

  // Security Settings
  security: {
    jwtSecret: process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION',
    bcryptRounds: 10,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests from this IP, please try again later.',
  },

  // File Upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    storageProvider: 'supabase', // 'supabase' or 'aws'
  },

  // Email Configuration (SendGrid)
  email: {
    enabled: isProduction,
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: 'noreply@wavesight.com',
    fromName: 'WaveSight',
    templates: {
      welcome: 'd-welcome',
      resetPassword: 'd-reset',
      verification: 'd-verify',
    },
  },

  // Payment Configuration (Stripe)
  payment: {
    enabled: isProduction,
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    currency: 'usd',
  },

  // Monitoring
  monitoring: {
    logLevel: isDevelopment ? 'debug' : 'info',
    enableConsoleLogging: true,
    enableFileLogging: isProduction,
    logFilePath: '/var/log/wavesight/',
  },
};

// Validate critical configuration
export function validateConfig() {
  const errors: string[] = [];

  if (isProduction) {
    if (!config.supabase.url) errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
    if (!config.supabase.anonKey) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
    if (config.security.jwtSecret === 'CHANGE_THIS_IN_PRODUCTION') {
      errors.push('JWT_SECRET must be changed in production');
    }
    if (!config.email.apiKey && config.email.enabled) {
      errors.push('SENDGRID_API_KEY is required when email is enabled');
    }
    if (!config.payment.secretKey && config.payment.enabled) {
      errors.push('STRIPE_SECRET_KEY is required when payments are enabled');
    }
  }

  if (errors.length > 0) {
    console.error('Configuration validation errors:', errors);
    if (isProduction) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  return errors.length === 0;
}

// Auto-validate on import in production
if (isProduction) {
  validateConfig();
}

export default config;