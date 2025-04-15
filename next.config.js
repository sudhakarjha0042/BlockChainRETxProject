/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // Add transpilePackages at the top level
  transpilePackages: ['gun'],
  
  // Add images configuration
  images: {
    domains: ['images.pexels.com'],
    remotePatterns: [
      // If you have any remote patterns, add them here
    ],
  },
  
  reactStrictMode: true,
  
  webpack: (config, { isServer }) => {
    // Resolve './lib/text-encoding' to our implementation
    config.resolve.alias['./lib/text-encoding'] = path.resolve(__dirname, 'src/lib/text-encoding.js');
    
    // Suppress critical dependency warnings for gun/sea.js
    config.module.rules.push({
      test: /gun\/sea\.js$/,
      use: [{ loader: 'null-loader' }],
    });
    
    // Add better module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Improve module resolution
    config.resolve.extensions = [...config.resolve.extensions, '.ts', '.tsx', '.js', '.jsx'];
    
    return config;
  },
};

module.exports = nextConfig;