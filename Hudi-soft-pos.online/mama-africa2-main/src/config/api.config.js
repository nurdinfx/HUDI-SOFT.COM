/**
 * API Configuration
 * Automatically detects environment and uses appropriate URLs
 */

// FORCE PRODUCTION
const isLocal = false;
const isProduction = true;

// Get the appropriate API URL based on environment
const getApiUrl = () => 'https://hudi-pos-online.onrender.com/api/v1';

const getBackendUrl = () => 'https://hudi-pos-online.onrender.com';

const getSocketUrl = () => 'https://hudi-pos-online.onrender.com';

export const API_CONFIG = {
  get API_URL() { return getApiUrl(); },
  get BACKEND_URL() { return getBackendUrl(); },
  get SOCKET_URL() { return getSocketUrl(); },
  IS_PRODUCTION: isProduction,
  IS_DEVELOPMENT: !isProduction,
};

// Log configuration in development
if (!isProduction) {
  console.log('🔧 API URL:', API_CONFIG.API_URL);
  console.log('🔧 BACKEND URL:', API_CONFIG.BACKEND_URL);
  console.log('🔧 SOCKET URL:', API_CONFIG.SOCKET_URL);
}

export default API_CONFIG;
