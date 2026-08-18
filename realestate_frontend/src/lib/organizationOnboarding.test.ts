import { describe, it, expect, beforeEach } from 'vitest';
import {
  hasSkippedOrganizationOnboarding,
  markOrganizationOnboardingSkipped,
  clearOrganizationOnboardingSkipped,
} from './organizationOnboarding';

const userWithId = { id: 'user-123', email: 'user@example.com' };
const userWithoutId = { id: '', email: 'no-id@example.com' };
const nullUser = null;

beforeEach(() => {
  localStorage.clear();
});

describe('hasSkippedOrganizationOnboarding', () => {
  it('returns false when nothing has been stored', () => {
    expect(hasSkippedOrganizationOnboarding(userWithId)).toBe(false);
  });

  it('returns true after marking as skipped', () => {
    markOrganizationOnboardingSkipped(userWithId);
    expect(hasSkippedOrganizationOnboarding(userWithId)).toBe(true);
  });

  it('uses the user id as the storage key', () => {
    markOrganizationOnboardingSkipped(userWithId);
    expect(hasSkippedOrganizationOnboarding({ id: 'other-id', email: 'other@example.com' })).toBe(false);
  });

  it('falls back to email when id is empty', () => {
    markOrganizationOnboardingSkipped(userWithoutId);
    expect(hasSkippedOrganizationOnboarding(userWithoutId)).toBe(true);
  });

  it('uses "anonymous" key when user is null', () => {
    markOrganizationOnboardingSkipped(nullUser);
    expect(hasSkippedOrganizationOnboarding(nullUser)).toBe(true);
  });
});

describe('markOrganizationOnboardingSkipped', () => {
  it('persists the skipped flag to localStorage', () => {
    markOrganizationOnboardingSkipped(userWithId);
    const key = `organizationOnboarding.skipped:user-123`;
    expect(localStorage.getItem(key)).toBe('true');
  });
});

describe('clearOrganizationOnboardingSkipped', () => {
  it('removes the skipped flag from localStorage', () => {
    markOrganizationOnboardingSkipped(userWithId);
    clearOrganizationOnboardingSkipped(userWithId);
    expect(hasSkippedOrganizationOnboarding(userWithId)).toBe(false);
  });

  it('is a no-op when nothing was stored', () => {
    expect(() => clearOrganizationOnboardingSkipped(userWithId)).not.toThrow();
  });
});
