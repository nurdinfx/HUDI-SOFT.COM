import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Suppress TypeScript build errors (warnings shown but build succeeds)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://hudi-soft-com-2.onrender.com/api',
    NEXT_PUBLIC_APP_NAME: 'HUDI DENTAL CARE',
  },
}

export default nextConfig
