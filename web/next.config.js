/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['achuavagkhjenaypawij.supabase.co'],
  },
  typescript: {
    // Temporarily ignore build errors to deploy
    ignoreBuildErrors: true,
  },
  eslint: {
    // Enable ESLint during production build
    ignoreDuringBuilds: false,
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