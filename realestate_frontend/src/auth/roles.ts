import { useAuthStore } from '@/store/authStore';

export const normalizeRole = (role: string) => role.trim().toLowerCase();

export const normalizeRoles = (roles: string[] = []) =>
  Array.from(new Set(roles.map(normalizeRole).filter(Boolean)));

export const hasAdminRole = (roles: string[] = []) => normalizeRoles(roles).includes('admin');

export const hasEmployerRole = (roles: string[] = []) => normalizeRoles(roles).includes('employer');

export const canAccessPortal = (roles: string[] = []) => hasAdminRole(roles) || hasEmployerRole(roles);

export const getCurrentUserRoles = () => normalizeRoles(useAuthStore.getState().user?.roles ?? []);

export const isCurrentUserAdmin = () => hasAdminRole(getCurrentUserRoles());
