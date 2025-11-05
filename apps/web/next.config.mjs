import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

loadEnv({ path: resolve(process.cwd(), '../../.env') });

/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  transpilePackages: ["@euclid/ui"],
  eslint: {
    dirs: ["src", "app"]
  }
};

export default nextConfig;
