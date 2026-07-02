import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "250mb"
    }
  },
  output: "standalone",
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
