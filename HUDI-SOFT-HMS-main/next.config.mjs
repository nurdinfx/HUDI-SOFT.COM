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
        // These paths are handled by Next.js app/api/* route handlers — do NOT proxy them.
        // (must be listed as negated sources or simply omitted from the proxy list)
        {
          source: '/api/licenses/validate',
          destination: '/api/licenses/validate',
        },
        // All other /api/* calls proxy to the HMS backend on Render
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://hudi-soft-hms.onrender.com'}/api/:path*`,
        },
      ]
    },
  }),
}

export default nextConfig
