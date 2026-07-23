/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Capacitor: generates a fully static export in /out
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Static export requires unoptimized images
    unoptimized: true,
  },
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
}

export default nextConfig
