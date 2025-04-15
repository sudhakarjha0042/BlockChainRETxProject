import 'text-encoding-polyfill';

// Set up TextEncoder and TextDecoder polyfills globally
if (typeof global !== 'undefined') {
  const textEncoding = require('../lib/text-encoding-mock');
  if (!global.TextEncoder) global.TextEncoder = textEncoding.TextEncoder;
  if (!global.TextDecoder) global.TextDecoder = textEncoding.TextDecoder;
}

// Conditional import for Gun to avoid SSR issues
let Gun;
let gun;
let user;

// Only import and initialize Gun on the client-side
if (typeof window !== 'undefined') {
  Gun = require('gun');
  require('gun/sea');
  require('gun/axe');
  
  // Initialize Gun instance
  gun = Gun({
    peers: ['http://localhost:8765/gun'],
  });
  
  // Ensure that SEA (security) works with sessions properly
  user = gun.user().recall({ sessionStorage: true });
} else {
  // Mock Gun for server-side rendering
  gun = {};
  user = { recall: () => {} };
}

export { user };
export default gun;
