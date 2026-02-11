import axios from 'axios';

// Create an Axios instance with base configuration
const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Unwrap the backend's { "data": ... } response envelope
// so API callers get the inner payload directly via response.data
axiosInstance.interceptors.response.use((response) => {
    if (response.data && response.data.data !== undefined) {
        response.data = response.data.data;
    }
    return response;
});

export default axiosInstance;