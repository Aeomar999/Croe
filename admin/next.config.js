const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/v1/:path*`,
      },
    ];
  },
  output: 'standalone',
  experimental: {
    // pnpm workspace: dependencies live in the repo-root node_modules/.pnpm,
    // so trace from the monorepo root or the standalone bundle misses `next`.
    outputFileTracingRoot: path.join(__dirname, '..'),
  },
};

module.exports = nextConfig;