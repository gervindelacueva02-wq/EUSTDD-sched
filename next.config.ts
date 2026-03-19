import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'preview-chat-10b79e78-a3ba-4aee-a9a8-b8f67301f353.space.z.ai',
  ],
};

export default nextConfig;
