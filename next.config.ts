import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  output: "standalone",

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  serverExternalPackages: [
    "mongoose",
    "ioredis",
    "bcrypt",
    "nodemailer",
    "jimp",
    "jsonwebtoken",
    "expo-server-sdk",
    "node-fetch",
    "resend",
    // Headless Chrome for report PDFs is loaded at runtime, not bundled.
    "puppeteer-core",
  ],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  // CORS is handled per-origin in proxy.ts (only allowlisted origins are echoed back)
};

export default nextConfig;