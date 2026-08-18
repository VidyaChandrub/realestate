const envAppOrigin = import.meta.env.VITE_APP_ORIGIN?.trim();

export const APP_ORIGIN = (envAppOrigin || window.location.origin).replace(/\/+$/, '');
export const AUTH_CALLBACK_URL = `${APP_ORIGIN}/auth/callback`;
