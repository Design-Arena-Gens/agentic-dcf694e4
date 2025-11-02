/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["@vercel/ai", "openai"],
  },
};

export default nextConfig;
