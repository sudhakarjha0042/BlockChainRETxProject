import Gun from 'gun';
import 'gun/sea'; // Security, Encryption, Authorization module
import 'gun/axe'; // Relay mesh networking optimization
import { TextEncoder, TextDecoder } from 'text-encoding'; // Polyfill for SEA

// Polyfill for SEA compatibility
if (typeof window !== 'undefined') {
  if (!window.TextEncoder) {
    window.TextEncoder = TextEncoder;
  }
  if (!window.TextDecoder) {
    window.TextDecoder = TextDecoder;
  }
}

// Initialize Gun instance
const gun = Gun({
  peers: ['http://localhost:8765/gun'], // Add more relay servers if needed
});

// Ensure that SEA (security) works with sessions properly
export const user = gun.user().recall({ sessionStorage: true });

// Export the Gun instance
export default gun;
