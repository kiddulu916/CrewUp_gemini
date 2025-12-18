import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com'], // Google OAuth profile images
  },
};

export default nextConfig;
