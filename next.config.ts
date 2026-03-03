import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable standalone for easier deployment on Render
  // output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
