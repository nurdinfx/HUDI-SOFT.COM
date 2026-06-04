/** @type {import('next').NextConfig} */

// Static export is ONLY needed for Capacitor (iOS/Android) builds.
// On Vercel, we use standard Next.js mode so rewrites and SSR work correctly.
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig = {
  ...(isCapacitorBuild && {
    output: 'export',
    trailingSlash: true,
  }),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
  // API proxy for Vercel deployment (ignored in static export mode)
  ...(!isCapacitorBuild && {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://hudi-soft-hms.onrender.com'}/api/:path*`,
        },
      ]
    },
  }),
}

export default nextConfig
