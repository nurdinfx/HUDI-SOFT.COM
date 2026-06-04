/**
 * API Configuration
 * Automatically detects environment and uses appropriate URLs
 */

// FORCE PRODUCTION
// Dynamic detection of environment
// PRIMARY CONFIGURATION
const PRODUCTION_URL = 'https://hudi-pos-online.onrender.com';
const LOCAL_URL = 'http://localhost:5000';

// Use Vite's build environment to determine the URL.
// When you run "npm run build" (which is used for the mobile app), this will ALWAYS be PRODUCTION_URL.
const BASE_URL = import.meta.env.PROD ? PRODUCTION_URL : LOCAL_URL;

export const API_CONFIG = {
  API_URL: `${BASE_URL}/api/v1`,
  BACKEND_URL: BASE_URL,
  SOCKET_URL: BASE_URL,
  IS_PRODUCTION: BASE_URL === PRODUCTION_URL,
  IS_DEVELOPMENT: BASE_URL === LOCAL_URL,
};

// Log configuration in development
if (API_CONFIG.IS_DEVELOPMENT) {
  console.log('🔧 API URL:', API_CONFIG.API_URL);
  console.log('🔧 BACKEND URL:', API_CONFIG.BACKEND_URL);
  console.log('🔧 SOCKET URL:', API_CONFIG.SOCKET_URL);
}

export default API_CONFIG;
