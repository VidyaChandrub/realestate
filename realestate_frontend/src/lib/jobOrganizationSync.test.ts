import { describe, it, expect, beforeEach } from 'vitest';
import {
  JOB_ORGANIZATIONS_STORAGE_KEY,
  JOB_SELECTED_ORGANIZATION_STORAGE_KEY,
  readStoredJobOrganizationId,
  persistJobOrganizations,
  persistSelectedJobOrganizationId,
  getDefaultJobOrganizationId,
  getEmployerMeOrganizations,
  resolveJobOrganizations,
  resolveSelectedJobOrganizationId,
} from './jobOrganizationSync';
import type { Employer } from '@/types';

const makeOrg = (id: string, name = `Org ${id}`): Employer => ({
  id,
  name,
  description: null,
  industry: null,
  logoUrl: null,
  website: null,
  foundedYear: null,
  companySize: null,
  type: null,
  contactEmail: null,
  contactPhone: null,
  country: null,
  state: null,
  city: null,
  address: null,
  postalCode: null,
  verificationStatus: 'verified',
  isFeatured: false,
  isApproved: true,
  isSuspended: false,
  isDeleted: false,
  jobsCount: 0,
  employeesCount: 0,
  benefits: [],
  createdAt: '',
  updatedAt: '',
});

beforeEach(() => {
  localStorage.clear();
});

// ── localStorage helpers ───────────────────────────────────────────────────────

describe('readStoredJobOrganizationId', () => {
  it('returns null when nothing is stored', () => {
    expect(readStoredJobOrganizationId()).toBeNull();
  });

  it('returns the stored id', () => {
    localStorage.setItem(JOB_SELECTED_ORGANIZATION_STORAGE_KEY, 'org-42');
    expect(readStoredJobOrganizationId()).toBe('org-42');
  });
});

describe('persistJobOrganizations', () => {
  it('writes the organizations array to localStorage as JSON', () => {
    const orgs = [makeOrg('1'), makeOrg('2')];
    persistJobOrganizations(orgs);
    const stored = JSON.parse(localStorage.getItem(JOB_ORGANIZATIONS_STORAGE_KEY)!);
    expect(stored).toHaveLength(2);
    expect(stored[0].id).toBe('1');
  });
});

describe('persistSelectedJobOrganizationId', () => {
  it('stores the organization id', () => {
    persistSelectedJobOrganizationId('org-7');
    expect(localStorage.getItem(JOB_SELECTED_ORGANIZATION_STORAGE_KEY)).toBe('org-7');
  });

  it('removes the key when organizationId is null', () => {
    localStorage.setItem(JOB_SELECTED_ORGANIZATION_STORAGE_KEY, 'org-7');
    persistSelectedJobOrganizationId(null);
    expect(localStorage.getItem(JOB_SELECTED_ORGANIZATION_STORAGE_KEY)).toBeNull();
  });
});

// ── Pure helpers ───────────────────────────────────────────────────────────────

describe('getDefaultJobOrganizationId', () => {
  it('returns the defaultOrganizationId string from meData', () => {
    expect(getDefaultJobOrganizationId({ defaultOrganizationId: 'org-1' })).toBe('org-1');
  });

  it('returns null when defaultOrganizationId is absent', () => {
    expect(getDefaultJobOrganizationId({})).toBeNull();
  });

  it('returns null when meData is null', () => {
    expect(getDefaultJobOrganizationId(null)).toBeNull();
  });
});

describe('getEmployerMeOrganizations', () => {
  it('returns an empty array when meData is null', () => {
    expect(getEmployerMeOrganizations(null)).toEqual([]);
  });

  it('collects organizations from meData.organizations array', () => {
    const org = makeOrg('1');
    const result = getEmployerMeOrganizations({ organizations: [org] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('collects organizations from meData.memberships (direct org objects)', () => {
    const org = makeOrg('2');
    const result = getEmployerMeOrganizations({ memberships: [org] });
    expect(result[0].id).toBe('2');
  });

  it('collects organizations from membership.organization', () => {
    const org = makeOrg('3');
    const result = getEmployerMeOrganizations({ memberships: [{ organization: org }] });
    expect(result[0].id).toBe('3');
  });

  it('collects organizations from membership.employer', () => {
    const org = makeOrg('4');
    const result = getEmployerMeOrganizations({ memberships: [{ employer: org }] });
    expect(result[0].id).toBe('4');
  });

  it('collects organizations from meData.organization, meData.defaultOrganization, meData.employer', () => {
    const result = getEmployerMeOrganizations({
      organization: makeOrg('5'),
      defaultOrganization: makeOrg('6'),
      employer: makeOrg('7'),
    });
    expect(result.map((o) => o.id)).toEqual(['5', '6', '7']);
  });

  it('deduplicates organizations with the same id', () => {
    const org = makeOrg('dup');
    const result = getEmployerMeOrganizations({
      organizations: [org],
      organization: org,
    });
    expect(result).toHaveLength(1);
  });

  it('ignores invalid (non-Employer) entries in arrays', () => {
    const result = getEmployerMeOrganizations({
      organizations: [{ notAnOrg: true }, makeOrg('valid')],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid');
  });
});

describe('resolveJobOrganizations', () => {
  it('prefers organizations derived from meData', () => {
    const meOrg = makeOrg('me-org');
    const fallback = [makeOrg('fallback-org')];
    const result = resolveJobOrganizations({ organizations: [meOrg] }, fallback);
    expect(result[0].id).toBe('me-org');
  });

  it('falls back to the provided list when meData yields nothing', () => {
    const fallback = [makeOrg('fallback-1'), makeOrg('fallback-2')];
    const result = resolveJobOrganizations(null, fallback);
    expect(result.map((o) => o.id)).toEqual(['fallback-1', 'fallback-2']);
  });

  it('deduplicates the fallback list', () => {
    const org = makeOrg('dup');
    const result = resolveJobOrganizations(null, [org, org]);
    expect(result).toHaveLength(1);
  });
});

describe('resolveSelectedJobOrganizationId', () => {
  it('returns the defaultOrganizationId when the organizations list is empty', () => {
    const result = resolveSelectedJobOrganizationId({
      meData: { defaultOrganizationId: 'default-org' },
      organizations: [],
      storedOrganizationId: null,
    });
    expect(result).toBe('default-org');
  });

  it('returns the storedOrganizationId when meOrganizations is non-empty and stored id matches', () => {
    // storedOrganizationId wins over defaultOrganizationId only when meOrganizations is non-empty
    const result = resolveSelectedJobOrganizationId({
      meData: { organizations: [makeOrg('me-org')], defaultOrganizationId: 'default-org' },
      organizations: [makeOrg('stored-org')],
      storedOrganizationId: 'stored-org',
    });
    expect(result).toBe('stored-org');
  });

  it('returns defaultOrganizationId when meOrganizations is empty (overrides stored id)', () => {
    // When meOrganizations is empty, defaultOrganizationId takes priority over stored id
    const result = resolveSelectedJobOrganizationId({
      meData: { defaultOrganizationId: 'default-org' },
      organizations: [makeOrg('stored-org')],
      storedOrganizationId: 'stored-org',
    });
    expect(result).toBe('default-org');
  });

  it('falls back to defaultOrganizationId when stored id is not in the list', () => {
    const result = resolveSelectedJobOrganizationId({
      meData: { organizations: [makeOrg('me-org')], defaultOrganizationId: 'default-org' },
      organizations: [makeOrg('default-org')],
      storedOrganizationId: 'unknown-org',
    });
    expect(result).toBe('default-org');
  });

  it('falls back to the first organization when stored and default ids are not in the list', () => {
    // meOrganizations must be non-empty to reach the fallback-to-first-org branch
    const result = resolveSelectedJobOrganizationId({
      meData: { organizations: [makeOrg('me-org')] },
      organizations: [makeOrg('first-org'), makeOrg('second-org')],
      storedOrganizationId: null,
    });
    expect(result).toBe('first-org');
  });

  it('returns defaultOrganizationId from meData when meOrganizations is empty and orgs exist', () => {
    const result = resolveSelectedJobOrganizationId({
      meData: { defaultOrganizationId: 'default-org' },
      organizations: [makeOrg('any-org')],
      storedOrganizationId: null,
    });
    expect(result).toBe('default-org');
  });
});
