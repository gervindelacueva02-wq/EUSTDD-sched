import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'preview-chat-bd8fd953-319f-49d0-b566-ee0f8ebef70b.space.z.ai',
    '.space.z.ai'
  ],
  experimental: {
    serverExternalPackages: ['@prisma/client', 'prisma'],
  },
};

export default nextConfig;
