import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  turbopack: {
    // pnpm workspace: Turbopack resolves CSS from the git root (parent dir).
    // Point root to the monorepo root so Turbopack can find all packages.
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
