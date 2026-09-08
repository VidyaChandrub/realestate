/** Dev fallback when FRONTEND_URL / APP_URL is not set. */
export const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

export function frontendBaseUrl(): string {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.APP_FRONTEND_URL ||
    process.env.APP_URL ||
    DEFAULT_FRONTEND_URL;
  return raw.replace(/\/$/, '');
}
