import axios from 'axios';

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
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
