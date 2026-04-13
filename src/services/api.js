import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const getFriendlyErrorMessage = (error) => {
  if (error?.response?.data?.message) {
    return String(error.response.data.message);
  }

  if (error?.message && error.message !== 'Network Error') {
    return String(error.message);
  }

  if (!error?.response) {
    return 'Unable to reach the server. Please check your connection.';
  }

  return 'Something went wrong. Please try again.';
};

let lastToast = { message: '', ts: 0 };

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    // Get token from zustand store
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const statusCode = error?.response?.status;
    const requestUrl = String(error?.config?.url || '');
    const suppressToast = Boolean(error?.config?.suppressGlobalErrorToast);

    if (error.response && error.response.status === 401) {
      // Call logout action if token is expired or invalid
      useAuthStore.getState().logout();
      if (!requestUrl.includes('/auth/login')) {
        window.location.href = '/login';
      }
    }

    if (!suppressToast && statusCode !== 401) {
      const message = getFriendlyErrorMessage(error);
      const now = Date.now();
      if (message !== lastToast.message || now - lastToast.ts > 1200) {
        toast.error(message);
        lastToast = { message, ts: now };
      }
    }

    return Promise.reject(error);
  }
);

export default api;
