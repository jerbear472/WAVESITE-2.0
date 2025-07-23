/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['achuavagkhjenaypawij.supabase.co'],
  },
  typescript: {
    // Enable type checking during production build
    ignoreBuildErrors: false,
  },
  eslint: {
    // Enable ESLint during production build
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig