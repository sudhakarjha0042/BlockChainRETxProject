/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname:'images.pexels.com',
      }
    ],
    // Note: The 'domains' property is deprecated and can be removed if only using remotePatterns.
    // domains: [], // Remove this line if it exists elsewhere
  },
  // Add webpack configuration
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module when running on the server side
    if (isServer) {
      // Ignore 'text-encoding' module required by gun/sea.js during server build
      config.externals.push('text-encoding');

      // Optional: If other Node.js built-ins cause issues (like 'crypto' potentially)
      // config.externals.push('crypto');
    }

    // Important: return the modified config
    return config;
  },
}

module.exports = nextConfig
