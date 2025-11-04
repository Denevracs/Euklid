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
