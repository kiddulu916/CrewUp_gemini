import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import createMDX from '@next/mdx';
import withBundleAnalyzer from '@next/bundle-analyzer';

// Enable bundle analyzer with ANALYZE=true
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx', 'mdx', 'md', 'js', 'jsx', 'json'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vfjcpxaplapnuwtzvord.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Optimize image sizes for better performance
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Use modern formats
    formats: ['image/avif', 'image/webp'],
    // Enable minimumCacheTTL for better caching
    minimumCacheTTL: 60,
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [{
        key: "Document-Policy",
        value: "js-profiling",
      }],
    }];
  },
};

const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
});

export default bundleAnalyzer(withMDX(withSentryConfig(nextConfig, {
  org: "corey-tb",
  project: "krewup",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
})));
