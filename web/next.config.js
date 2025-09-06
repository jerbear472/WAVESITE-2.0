/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['aicahushpcslwjwrlqbo.supabase.co'], // NEW Supabase instance
    minimumCacheTTL: 60, // Cache images for 60 seconds
    formats: ['image/webp'], // Use WebP format for better performance
  },
  // Performance optimizations
  experimental: {
    optimizeCss: false, // Disabled to avoid critters issues
    optimizePackageImports: ['lucide-react', 'framer-motion'], // Optimize specific packages
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Remove console logs in production
  },
  typescript: {
    // Enable TypeScript checking during build
    ignoreBuildErrors: false,
  },
  eslint: {
    // Enable ESLint during production build
    ignoreDuringBuilds: false,
  },
  // Expose non-prefixed env vars to the client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  webpack: (config, { isServer }) => {
    // Fix for Tesseract.js worker files
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: '/wavesight-dashboard.html',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/old-dashboard',
        destination: '/dashboard',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig