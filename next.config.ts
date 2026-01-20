import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-pty", "better-sqlite3"],
};

export default nextConfig;
