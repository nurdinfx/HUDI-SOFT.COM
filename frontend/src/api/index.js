import axios from 'axios';

let VITE_API_URL = import.meta.env.VITE_API_URL || 'https://hudi-soft-com.onrender.com/api';
// Remove trailing slash if present
if (VITE_API_URL.endsWith('/')) {
    VITE_API_URL = VITE_API_URL.slice(0, -1);
}

export const ASSET_URL = VITE_API_URL.replace('/api', '');

const API = axios.create({
    baseURL: VITE_API_URL,
    // 20-second timeout — gives Render free-tier enough time to wake up
    // without leaving the user staring at a spinner forever
    timeout: 20000,
});

// Attach auth token to every request
API.interceptors.request.use((config) => {
    const userInfo  = JSON.parse(localStorage.getItem('userInfo')  || 'null');
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
    const token = userInfo?.token || adminInfo?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Response interceptor — convert network/timeout errors into user-friendly messages
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            // Server took too long — likely a Render cold start
            return Promise.reject({
                response: {
                    data: {
                        message: 'The server is waking up (free tier). Please wait a moment and try again.'
                    }
                }
            });
        }
        if (!error.response) {
            // No response at all — CORS block or server completely down
            return Promise.reject({
                response: {
                    data: {
                        message: 'Cannot reach the server. Please check your connection and try again.'
                    }
                }
            });
        }
        return Promise.reject(error);
    }
);

export default API;
