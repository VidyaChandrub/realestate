import type { AuthUser } from '@/types';

const ORGANIZATION_ONBOARDING_SKIPPED_PREFIX = 'organizationOnboarding.skipped';

const getSkipKey = (user: Pick<AuthUser, 'id' | 'email'> | null | undefined) => {
  const userKey = user?.id || user?.email || 'anonymous';
  return `${ORGANIZATION_ONBOARDING_SKIPPED_PREFIX}:${userKey}`;
};

export const hasSkippedOrganizationOnboarding = (user: Pick<AuthUser, 'id' | 'email'> | null | undefined) => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(getSkipKey(user)) === 'true';
};

export const markOrganizationOnboardingSkipped = (user: Pick<AuthUser, 'id' | 'email'> | null | undefined) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getSkipKey(user), 'true');
};

export const clearOrganizationOnboardingSkipped = (user: Pick<AuthUser, 'id' | 'email'> | null | undefined) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(getSkipKey(user));
};
