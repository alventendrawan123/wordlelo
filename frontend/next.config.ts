import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@wordlelo/contracts"],
};

export default nextConfig;
