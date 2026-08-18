import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { normalizeRoles } from '@/auth/roles';
import type { AuthUser } from '@/types';

type RegisterResult =
  | {
      success: true;
      emailVerificationRequired: true;
      message: string;
    }
  | AuthUser;

// Map backend UserRole enum values to the lowercase role strings the admin expects
function mapBackendRole(role: string): string {
  switch (role?.toUpperCase()) {
    case 'ADMIN': return 'admin';
    case 'EMPLOYER': return 'employer';
    default: return role?.toLowerCase() ?? '';
  }
}

async function fetchAuthUser(): Promise<AuthUser> {
  const { data } = await apiClient.get('/api/v1/users/me');
  const user = data?.data ?? data;

  // preferences.role is a single string ('JOB_SEEKER' | 'EMPLOYER' | 'ADMIN')
  const rawRole: string = user.preferences?.role ?? '';
  const backendRoles: string[] = rawRole ? [mapBackendRole(rawRole)] : [];

  return {
    id: user.userId || user.id || '',
    email: user.email || '',
    name:
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.email ||
      'User',
    roles: normalizeRoles(backendRoles),
    organization: user.organization ?? null,
  };
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { setTokens, setUser } = useAuthStore.getState();

  const { data } = await apiClient.post('/api/v1/auth/login', { email, password, role: 'EMPLOYER' });
  const payload = data?.data ?? data;

  setTokens(payload.accessToken, payload.refreshToken ?? null, null);

  const authUser = await fetchAuthUser();
  setUser(authUser);
  return authUser;
}

export async function register(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
  mobileNumber?: string,
): Promise<RegisterResult> {
  const { data } = await apiClient.post('/api/v1/auth/register', {
    email,
    password,
    firstName,
    lastName,
    mobileNumber,
    role: 'EMPLOYER',
  });
  const payload = data?.data ?? data;

  if (payload?.emailVerificationRequired === true) {
    return payload as RegisterResult;
  }

  return login(email, password);
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post('/api/v1/auth/forgot-password', { email });
  return data?.data ?? data;
}

export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post('/api/v1/auth/resend-verification-email', { email });
  return data?.data ?? data;
}

export function logout(): void {
  useAuthStore.getState().logout();
  window.location.href = '/';
}
