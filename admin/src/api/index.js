import axios from 'axios';

const RAW_URL = (import.meta.env.VITE_API_URL || 'https://hudi-soft-com.onrender.com/api').trim().replace(/[\r\n\s\t]+/g, '');

// Robust normalization: strip any trailing slashes, remove any trailing '/api' segments, and append exactly one '/api'
let cleanUrl = RAW_URL.replace(/\/+$/, ''); // remove trailing slashes
cleanUrl = cleanUrl.replace(/(\/api)+$/, ''); // remove any trailing /api/api...
cleanUrl = cleanUrl.replace(/\/+$/, ''); // remove trailing slashes again
const VITE_API_URL = `${cleanUrl}/api`;

console.log('API Initialized with baseURL:', VITE_API_URL);

export const ASSET_URL = VITE_API_URL.replace('/api', '');

const API = axios.create({
    baseURL: VITE_API_URL,
});

// Add a request interceptor to include the token from localStorage
API.interceptors.request.use((config) => {
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
    if (adminInfo?.token) {
        config.headers.Authorization = `Bearer ${adminInfo.token}`;
    }
    return config;
});

export default API;
