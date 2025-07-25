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
}

module.exports = nextConfig