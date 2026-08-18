import { create } from 'zustand';
import type { AuthState } from '@/types';

const storedUser = (() => {
  try {
    const raw = localStorage.getItem('auth.user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser,
  isAuthenticated: !!storedUser && !!localStorage.getItem('accessToken'),
  isLoading: true,
  isLoggingOut: false,
  token: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  idToken: localStorage.getItem('idToken'),
  setUser: (user) => {
    if (user) {
      localStorage.setItem('auth.user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth.user');
    }
    set({ user, isAuthenticated: !!user, isLoggingOut: false });
  },
  setToken: (token) => {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
    set({ token });
  },
  setTokens: (token, refreshToken, idToken) => {
    if (token) localStorage.setItem('accessToken', token);
    else localStorage.removeItem('accessToken');

    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    else localStorage.removeItem('refreshToken');

    if (idToken) localStorage.setItem('idToken', idToken);
    else localStorage.removeItem('idToken');

    set({ token, refreshToken, idToken });
  },
  setLoading: (isLoading) => set({ isLoading }),
  startLogout: () => set({ isLoggingOut: true, isLoading: false }),
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('auth.user');
    set({
      user: null,
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      idToken: null,
      isLoggingOut: false,
    });
  },
}));
