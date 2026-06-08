import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@wordlelo/contracts"],
  // Proxy the backend so its origin (BE_URL, server-only) is never exposed to
  // the browser and there is no cross-origin request. The client calls
  // same-origin /api/v1/* and Next forwards it to the backend.
  async rewrites() {
    const backend = process.env.BE_URL;
    if (!backend) {
      return [];
    }
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backend}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
