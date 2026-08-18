import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeRole,
  normalizeRoles,
  hasAdminRole,
  hasEmployerRole,
  canAccessPortal,
  getCurrentUserRoles,
  isCurrentUserAdmin,
} from './roles';
import { useAuthStore } from '@/store/authStore';

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe('normalizeRole', () => {
  it('lowercases the role', () => {
    expect(normalizeRole('ADMIN')).toBe('admin');
    expect(normalizeRole('Employer')).toBe('employer');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeRole('  admin  ')).toBe('admin');
  });
});

describe('normalizeRoles', () => {
  it('normalizes an array of roles', () => {
    expect(normalizeRoles(['ADMIN', 'employer'])).toEqual(['admin', 'employer']);
  });

  it('deduplicates roles after normalization', () => {
    expect(normalizeRoles(['admin', 'ADMIN', 'Admin'])).toEqual(['admin']);
  });

  it('filters out empty strings', () => {
    expect(normalizeRoles(['', 'admin', ''])).toEqual(['admin']);
  });

  it('returns empty array when called with no argument', () => {
    expect(normalizeRoles()).toEqual([]);
  });
});

describe('hasAdminRole', () => {
  it('returns true when "admin" is present', () => {
    expect(hasAdminRole(['admin'])).toBe(true);
  });

  it('returns true for uppercase ADMIN', () => {
    expect(hasAdminRole(['ADMIN'])).toBe(true);
  });

  it('returns false when admin is not present', () => {
    expect(hasAdminRole(['employer'])).toBe(false);
  });

  it('returns false for an empty array', () => {
    expect(hasAdminRole([])).toBe(false);
  });
});

describe('hasEmployerRole', () => {
  it('returns true when "employer" is present', () => {
    expect(hasEmployerRole(['employer'])).toBe(true);
  });

  it('returns true for uppercase EMPLOYER', () => {
    expect(hasEmployerRole(['EMPLOYER'])).toBe(true);
  });

  it('returns false when employer is not present', () => {
    expect(hasEmployerRole(['admin'])).toBe(false);
  });
});

describe('canAccessPortal', () => {
  it('returns true for an admin', () => {
    expect(canAccessPortal(['admin'])).toBe(true);
  });

  it('returns true for an employer', () => {
    expect(canAccessPortal(['employer'])).toBe(true);
  });

  it('returns true when both roles are present', () => {
    expect(canAccessPortal(['admin', 'employer'])).toBe(true);
  });

  it('returns false for an unrecognised role', () => {
    expect(canAccessPortal(['user'])).toBe(false);
  });

  it('returns false for an empty array', () => {
    expect(canAccessPortal([])).toBe(false);
  });
});

describe('getCurrentUserRoles', () => {
  it('returns an empty array when no user is in the store', () => {
    expect(getCurrentUserRoles()).toEqual([]);
  });

  it('returns normalized roles from the store user', () => {
    useAuthStore.setState({
      user: { id: '1', email: 'a@b.com', name: 'A', roles: ['ADMIN', 'admin'] },
    });
    expect(getCurrentUserRoles()).toEqual(['admin']);
  });
});

describe('isCurrentUserAdmin', () => {
  it('returns false when no user is in the store', () => {
    expect(isCurrentUserAdmin()).toBe(false);
  });

  it('returns true when the stored user has the admin role', () => {
    useAuthStore.setState({
      user: { id: '1', email: 'a@b.com', name: 'A', roles: ['admin'] },
    });
    expect(isCurrentUserAdmin()).toBe(true);
  });

  it('returns false when the stored user only has the employer role', () => {
    useAuthStore.setState({
      user: { id: '1', email: 'a@b.com', name: 'A', roles: ['employer'] },
    });
    expect(isCurrentUserAdmin()).toBe(false);
  });
});
