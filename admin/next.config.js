const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    // pnpm workspace: dependencies live in the repo-root node_modules/.pnpm,
    // so trace from the monorepo root or the standalone bundle misses `next`.
    outputFileTracingRoot: path.join(__dirname, '..'),
  },
};

module.exports = nextConfig;