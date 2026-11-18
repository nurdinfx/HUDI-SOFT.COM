/**
 * API Configuration
 * Automatically detects environment and uses appropriate URLs
 */

// FORCE PRODUCTION
// Dynamic detection of environment
// PRIMARY CONFIGURATION
let PRODUCTION_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'https://hudi-pos-online-aetz.onrender.com';
const LOCAL_URL = 'http://localhost:5000';

// Sanitize production URL
PRODUCTION_URL = PRODUCTION_URL.trim().replace(/\/+$/, '');

// If PRODUCTION_URL points to the old Render backend or frontend static host,
// force it to connect to the actual active Render backend service.
if (PRODUCTION_URL.includes('hudi-soft-com-online-pos') ||
    PRODUCTION_URL === 'https://hudi-pos-online.onrender.com' || 
    (typeof window !== 'undefined' && window.location.hostname === 'hudi-pos-online.onrender.com')) {
  PRODUCTION_URL = 'https://hudi-pos-online-aetz.onrender.com';
}

const BASE_URL = import.meta.env.PROD ? PRODUCTION_URL : LOCAL_URL;

let configuredApiUrl = import.meta.env.VITE_API_URL || `${BASE_URL}/api/v1`;
if (configuredApiUrl.includes('hudi-soft-com-online-pos')) {
  configuredApiUrl = 'https://hudi-pos-online-aetz.onrender.com/api/v1';
}

let configuredSocketUrl = import.meta.env.VITE_SOCKET_URL || BASE_URL;
if (configuredSocketUrl.includes('hudi-soft-com-online-pos')) {
  configuredSocketUrl = 'https://hudi-pos-online-aetz.onrender.com';
}

export const API_CONFIG = {
  API_URL: configuredApiUrl,
  BACKEND_URL: BASE_URL,
  SOCKET_URL: configuredSocketUrl,
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
