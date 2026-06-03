import axios from 'axios';

let VITE_API_URL = import.meta.env.VITE_API_URL || 'https://hudi-soft-com.onrender.com/api';
// Remove trailing slash if present
if (VITE_API_URL.endsWith('/')) {
    VITE_API_URL = VITE_API_URL.slice(0, -1);
}

export const ASSET_URL = VITE_API_URL.replace('/api', '');

const API = axios.create({
    baseURL: VITE_API_URL,
});

// Add a request interceptor to include the token from localStorage
API.interceptors.request.use((config) => {
    // Both user and admin info are stored under different keys depending on the app, 
    // but we can try to find them.
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
    const token = userInfo?.token || adminInfo?.token;
    
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default API;
