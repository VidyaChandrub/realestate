import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { showDeactivatedModal } from '@/api/deactivated-modal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipGlobalErrorHandler?: boolean;
  }
}

const getBackendMessage = (error: { response?: { data?: unknown } }) => {
  const payload = error.response?.data;

  if (typeof payload === 'string') {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message;
    return typeof message === 'string' ? message : null;
  }

  return null;
};

const isDeactivatedOrSuspendedAccountError = (error: { response?: { data?: unknown } }) => {
  const message = getBackendMessage(error);
  if (!message) {
    return false;
  }

  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes('deactivated') || normalizedMessage.includes('suspended');
};

// Global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.config?.skipGlobalErrorHandler) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    const { logout, isAuthenticated, token } = useAuthStore.getState();
    const hasActiveSession = isAuthenticated || !!token;

    if (status === 401 && !isLoginRequest && hasActiveSession && isDeactivatedOrSuspendedAccountError(error)) {
      const backendMessage =
        getBackendMessage(error) || 'Your account has been deactivated or suspended by an administrator.';
      logout();                                           // clear session immediately
      showDeactivatedModal(backendMessage).then(() => {   // block until user clicks
        window.location.href = '/';
      });
    } else if (status === 401 && !isLoginRequest) {
      logout();
      if (typeof window !== 'undefined') window.location.href = '/';
    } else if (status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else if (status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject(error);
  },
);

export default apiClient;
