import { JobMatcher } from '../ranking/job.matcher';
import { FeedJobCandidate, FeedUserProfile } from '../interfaces/feed-candidate.interface';

function baseProfile(overrides: Partial<FeedUserProfile> = {}): FeedUserProfile {
  return {
    id: 'profile-1',
    userId: 'user-1',
    currentCityId: null,
    stateId: null,
    countryId: null,
    highestQualificationId: null,
    highestQualificationValue: null,
    experienceLevelId: null,
    preferredEmploymentTypeId: [],
    preferredWorkMode: [],
    totalExperienceMonths: 36,
    preferredCategoryIds: [],
    preferredInterestIds: [],
    skills: [],
    preferredLocations: [],
    ...overrides,
  };
}

function baseJob(overrides: Partial<FeedJobCandidate> = {}): FeedJobCandidate {
  return {
    id: 'job-1',
    organizationId: 'org-1',
    organizationName: 'Org 1',
    title: 'Test Job',
    description: null,
    summary: null,
    categoryId: null,
    locationId: null,
    minExperienceMonths: null,
    maxExperienceMonths: null,
    experienceLevelId: null,
    educationLevelIds: [],
    educationLevelParentIds: [],
    educationLevelValues: [],
    skillIds: [],
    skillValues: [],
    workMode: null,
    salaryMin: null,
    salaryMax: null,
    employmentTypeId: null,
    jobType: 'INTERNAL' as any,
    externalUrl: null,
    status: 'ACTIVE' as any,
    publishedAt: new Date(),
    expiresAt: null,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    backgroundImage: null,
    skills: [],
    similarityScore: undefined,
    ...overrides,
  } as FeedJobCandidate;
}

describe('JobMatcher', () => {
  const matcher = new JobMatcher();

  // Location, experience, and skill fit are enforced/embedded upstream (SQL filters
  // in JobsService.getRelevantJobs, and the embedding content itself). matchScore is
  // semantic (90%) + qualification (10%) — these tests cover both components and
  // their weighted combination.

  describe('semantic (embedding similarity) component', () => {
    it('treats a missing similarityScore as 0', () => {
      const job = baseJob({ similarityScore: undefined });
      const profile = baseProfile();
      // semantic=0, qualification=100 (no requirement) -> 0*.90 + 100*.10 = 10
      expect(matcher.score(job, profile)).toBe(10);
    });

    it('rescales similarity at the floor (0.25) to 0', () => {
      const job = baseJob({ similarityScore: 0.25 });
      const profile = baseProfile();
      expect(matcher.score(job, profile)).toBe(10); // same as missing: semantic=0
    });

    it('rescales similarity at the ceiling (0.75) to full semantic credit', () => {
      const job = baseJob({ similarityScore: 0.75 });
      const profile = baseProfile();
      // semantic=100*.90=90, qualification=100*.10=10 -> 100
      expect(matcher.score(job, profile)).toBe(100);
    });

    it('clamps similarity above the ceiling to 100', () => {
      const job = baseJob({ similarityScore: 0.95 });
      const profile = baseProfile();
      expect(matcher.score(job, profile)).toBe(100);
    });

    it('rescales a mid-range similarity proportionally', () => {
      // (0.45 - 0.25) / (0.75 - 0.25) = 0.4 -> semantic=40 -> 40*.90=36, qual=100*.10=10 -> 46
      const job = baseJob({ similarityScore: 0.45 });
      const profile = baseProfile();
      expect(matcher.score(job, profile)).toBe(46);
    });
  });

  describe('qualification component', () => {
    it('treats no job requirement as neutral (100)', () => {
      const job = baseJob({ similarityScore: 0.75, educationLevelIds: [] });
      const profile = baseProfile({ highestQualificationId: 'edu-1' });
      expect(matcher.score(job, profile)).toBe(100);
    });

    it('treats a missing user qualification as neutral (100), not a penalty', () => {
      const job = baseJob({ similarityScore: 0.75, educationLevelIds: ['edu-req'] });
      const profile = baseProfile({ highestQualificationId: null });
      expect(matcher.score(job, profile)).toBe(100);
    });

    it('matches on exact qualification ID', () => {
      const job = baseJob({ similarityScore: 0.75, educationLevelIds: ['edu-1'] });
      const profile = baseProfile({ highestQualificationId: 'edu-1' });
      expect(matcher.score(job, profile)).toBe(100);
    });

    it('matches on parent qualification ID', () => {
      const job = baseJob({
        similarityScore: 0.75,
        educationLevelIds: ['edu-specific'],
        educationLevelParentIds: ['edu-general'],
      });
      const profile = baseProfile({ highestQualificationId: 'edu-general' });
      expect(matcher.score(job, profile)).toBe(100);
    });

    it('matches degree-abbreviation aliases (B.Sc <-> B.S. in <field>)', () => {
      const job = baseJob({
        similarityScore: 0.75,
        educationLevelIds: ['edu-other'],
        educationLevelValues: ['B.S. in Biological Sciences'],
      });
      const profile = baseProfile({
        highestQualificationId: 'edu-bsc',
        highestQualificationValue: 'B.Sc',
      });
      expect(matcher.score(job, profile)).toBe(100);
    });

    it('matches a "/"-joined alternative in the job requirement (e.g. "BA/BS Degree")', () => {
      const job = baseJob({
        similarityScore: 0.75,
        educationLevelIds: ['edu-other-1', 'edu-other-2'],
        educationLevelValues: ['MS/PhD/PharmD', 'BA/BS Degree'],
      });
      const profile = baseProfile({
        highestQualificationId: 'edu-bsc',
        highestQualificationValue: 'B.Sc',
      });
      expect(matcher.score(job, profile)).toBe(100);
    });

    it('does not match unrelated degrees', () => {
      const job = baseJob({
        similarityScore: 0.75,
        educationLevelIds: ['edu-other'],
        educationLevelValues: ['Bachelor’s Degree in Computer Science'],
      });
      const profile = baseProfile({
        highestQualificationId: 'edu-bsc',
        highestQualificationValue: 'B.Sc',
      });
      // semantic=100*.90=90, qualification=0*.10=0 -> 90
      expect(matcher.score(job, profile)).toBe(90);
    });
  });

  describe('a real case from the matchScore investigation', () => {
    it('a UX-skills profile with a Computer Science qualification does not get a full qualification match against an unrelated Java job requiring a specific unrelated degree', () => {
      const job = baseJob({
        similarityScore: 0.45,
        educationLevelIds: ['edu-other'],
        educationLevelValues: ['Bachelor’s Degree in Computer Science'],
      });
      const profile = baseProfile({
        highestQualificationId: 'edu-mca',
        highestQualificationValue: 'MCA',
      });
      // semantic: (0.45-0.25)/(0.75-0.25)=0.4 -> 40*.90=36
      // qualification=0*.10=0 (MCA doesn't textually match
      // "Bachelor's Degree in Computer Science") -> 36
      expect(matcher.score(job, profile)).toBe(36);
    });
  });
});
