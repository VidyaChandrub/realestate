import type { MasterDataItem } from '@/types';

export const makeItem = (
  overrides: Partial<MasterDataItem> & { id: string; value: string; type: string }
): MasterDataItem => ({
  slug: overrides.id,
  description: null,
  parentId: null,
  isActive: true,
  sortOrder: 0,
  metadata: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const CATEGORY = makeItem({ id: 'cat-1', value: 'Career Fair', type: 'EVENT_CATEGORY' });

export const COUNTRY_IN = makeItem({ id: 'country-in', value: 'India', type: 'LOCATION_COUNTRY', slug: 'india' });
export const COUNTRY_US = makeItem({ id: 'country-us', value: 'United States', type: 'LOCATION_COUNTRY', slug: 'united-states' });

export const STATE_KA = makeItem({ id: 'state-ka', value: 'Karnataka', type: 'LOCATION_STATE', slug: 'karnataka', parentId: 'country-in' });
export const STATE_MH = makeItem({ id: 'state-mh', value: 'Maharashtra', type: 'LOCATION_STATE', slug: 'maharashtra', parentId: 'country-in' });
export const STATE_CA = makeItem({ id: 'state-ca', value: 'California', type: 'LOCATION_STATE', slug: 'california', parentId: 'country-us' });

export const CITY_BLR = makeItem({ id: 'city-blr', value: 'Bangalore', type: 'LOCATION_CITY', slug: 'bangalore', parentId: 'state-ka' });
export const CITY_MUM = makeItem({ id: 'city-mum', value: 'Mumbai', type: 'LOCATION_CITY', slug: 'mumbai', parentId: 'state-mh' });
export const CITY_SF  = makeItem({ id: 'city-sf',  value: 'San Francisco', type: 'LOCATION_CITY', slug: 'san-francisco', parentId: 'state-ca' });

export const SKILL_REACT = makeItem({ id: 'skill-react', value: 'React', type: 'SKILL' });
export const SKILL_NODE  = makeItem({ id: 'skill-node',  value: 'Node.js', type: 'SKILL' });

export const EXP_JUNIOR = makeItem({ id: 'exp-junior', value: 'Junior', type: 'EXPERIENCE_LEVEL' });
export const EDU_BTECH  = makeItem({ id: 'edu-btech',  value: 'B.Tech', type: 'EDUCATION_LEVEL' });
export const SPEC_CSE = makeItem({ id: 'spec-cse', value: 'Computer Science', type: 'SPECIALIZATION', parentId: 'edu-btech' });

export const ORGANIZATION = { id: 'org-1', name: 'Acme Corp' };

export const MOCK_EVENT = {
  id: 'event-1',
  title: 'Existing Event',
  description: 'Some description',
  categoryId: 'cat-1',
  mode: 'OFFLINE' as const,
  locationId: 'city-blr',
  meetingUrl: '',
  isMeetingUrlPublished: false,
  registrationType: 'INTERNAL' as const,
  capacity: 100,
  startDate: '2026-06-01T09:00:00.000Z',
  endDate: '2026-06-01T17:00:00.000Z',
  isFree: true,
  price: null,
  status: 'DRAFT',
  bannerImage: '',
  tags: [
    { id: 'country-in', type: 'LOCATION_COUNTRY' },
    { id: 'state-ka',   type: 'LOCATION_STATE' },
    { id: 'city-blr',   type: 'LOCATION_CITY' },
    { id: 'skill-react', type: 'SKILL' },
    { id: 'exp-junior',  type: 'EXPERIENCE_LEVEL' },
    { id: 'edu-btech',   type: 'EDUCATION_LEVEL' },
    { id: 'spec-cse', value: 'Computer Science', type: 'SPECIALIZATION', parentId: 'edu-btech' },
  ],
};
