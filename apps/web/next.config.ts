import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backend = (process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
    return [{ source: "/backend-api/:path*", destination: `${backend}/:path*` }];
  },
  experimental: {
    // Preserve the backend's 100 MB upload contract through Clerk's proxy.
    proxyClientMaxBodySize: 100_000_000,
    // Verified generation can make multiple bounded model calls.
    proxyTimeout: 900_000,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
