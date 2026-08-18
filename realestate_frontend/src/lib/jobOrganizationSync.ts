import type { Employer } from '@/types';

export const JOB_ORGANIZATIONS_STORAGE_KEY = 'jobs.organizations';
export const JOB_SELECTED_ORGANIZATION_STORAGE_KEY = 'jobs.selectedOrganizationId';

type EmployerMeMembership = {
  organization?: unknown;
  employer?: unknown;
};

export type EmployerMeData = {
  defaultOrganizationId?: string | null;
  organization?: unknown;
  defaultOrganization?: unknown;
  employer?: unknown;
  organizations?: unknown;
  memberships?: unknown;
};

function isEmployerOrganization(value: unknown): value is Employer {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}

function uniqueOrganizations(organizations: Employer[]) {
  const seen = new Set<string>();
  return organizations.filter((organization) => {
    if (seen.has(organization.id)) return false;
    seen.add(organization.id);
    return true;
  });
}

export function readStoredJobOrganizationId() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(JOB_SELECTED_ORGANIZATION_STORAGE_KEY);
}

export function persistJobOrganizations(organizations: Employer[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(JOB_ORGANIZATIONS_STORAGE_KEY, JSON.stringify(organizations));
}

export function persistSelectedJobOrganizationId(organizationId: string | null) {
  if (typeof window === 'undefined') return;

  if (!organizationId) {
    window.localStorage.removeItem(JOB_SELECTED_ORGANIZATION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(JOB_SELECTED_ORGANIZATION_STORAGE_KEY, organizationId);
}

export function getDefaultJobOrganizationId(meData: EmployerMeData | undefined | null) {
  return typeof meData?.defaultOrganizationId === 'string' ? meData.defaultOrganizationId : null;
}

export function getEmployerMeOrganizations(meData: EmployerMeData | undefined | null) {
  if (!meData) return [];

  const organizations: Employer[] = [];

  if (Array.isArray(meData.organizations)) {
    organizations.push(...meData.organizations.filter(isEmployerOrganization));
  }

  if (Array.isArray(meData.memberships)) {
    meData.memberships.forEach((membership) => {
      if (isEmployerOrganization(membership)) {
        organizations.push(membership);
        return;
      }

      const item = membership as EmployerMeMembership;
      if (isEmployerOrganization(item?.organization)) organizations.push(item.organization);
      if (isEmployerOrganization(item?.employer)) organizations.push(item.employer);
    });
  }

  if (isEmployerOrganization(meData.organization)) organizations.push(meData.organization);
  if (isEmployerOrganization(meData.defaultOrganization)) organizations.push(meData.defaultOrganization);
  if (isEmployerOrganization(meData.employer)) organizations.push(meData.employer);

  return uniqueOrganizations(organizations);
}

export function resolveJobOrganizations(
  meData: EmployerMeData | undefined | null,
  fallbackOrganizations: Employer[]
) {
  const meOrganizations = getEmployerMeOrganizations(meData);

  if (meOrganizations.length > 0) {
    return meOrganizations;
  }

  return uniqueOrganizations(fallbackOrganizations);
}

export function resolveSelectedJobOrganizationId({
  meData,
  organizations,
  storedOrganizationId,
}: {
  meData: EmployerMeData | undefined | null;
  organizations: Employer[];
  storedOrganizationId: string | null;
}) {
  const defaultOrganizationId = getDefaultJobOrganizationId(meData);
  const meOrganizations = getEmployerMeOrganizations(meData);
  if (organizations.length === 0) return defaultOrganizationId;

  const hasOrganization = (organizationId: string | null) =>
    !!organizationId && organizations.some((organization) => organization.id === organizationId);

  if (meOrganizations.length === 0 && defaultOrganizationId) {
    return defaultOrganizationId;
  }

  if (hasOrganization(storedOrganizationId)) {
    return storedOrganizationId;
  }

  if (hasOrganization(defaultOrganizationId)) {
    return defaultOrganizationId;
  }

  return organizations[0].id;
}
