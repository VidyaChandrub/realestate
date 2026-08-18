import { EventMatcher } from '../ranking/event.matcher';
import { JobMatcher } from '../ranking/job.matcher';
import { MatchScoreService } from '../ranking/match-score.service';

describe('MatchScoreService', () => {
  const service = new MatchScoreService(new JobMatcher(), new EventMatcher());

  const profile = {
    id: 'profile-1',
    userId: 'kc-1',
    currentCityId: 'city-1',
    stateId: null,
    countryId: null,
    highestQualificationId: 'edu-1',
    highestQualificationValue: null,
    experienceLevelId: 'exp-level-1',
    preferredEmploymentTypeId: ['emp-type-1'],
    preferredWorkMode: ['HYBRID' as const],
    totalExperienceMonths: 36,
    preferredCategoryIds: ['cat-1'],
    preferredInterestIds: ['tag-1', 'tag-2'],
    skills: [
      { masterDataId: 'skill-1' },
      { masterDataId: 'skill-2' },
    ],
    preferredLocations: [{ locationId: 'city-1' }],
  };

  it('scores a job as semantic (90%) + qualification (10%) — location/experience/skill fit are enforced upstream (SQL filters / embedding content), not scored here', () => {
    const [ranked] = service.rankJobs(
      [
        {
          id: 'job-1',
          organizationId: 'org-1',
          organizationName: 'Org 1',
          sourceName: null,
          title: 'Clinical Research Associate',
          description: null,
          descriptionPreview: null,
          summary: null,
          categoryId: 'cat-1',
          locationId: 'city-1',
          minExperienceMonths: 24,
          maxExperienceMonths: 48,
          experienceLevelId: 'exp-level-1',
          educationLevelIds: [],
          educationLevelParentIds: [],
          educationLevelValues: [],
          skillIds: ['skill-1', 'skill-3'],
          skillValues: ['Java', 'Node.js'],
          similarityScore: 0.45,
          workMode: 'HYBRID',
          salaryMin: 1,
          salaryMax: 2,
          employmentTypeId: 'emp-type-1',
          jobType: 'INTERNAL',
          externalUrl: null,
          status: 'ACTIVE',
          publishedAt: new Date(),
          expiresAt: null,
          rejectionReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          backgroundImage: null,
          companyLogo: null,
          skills: [
            { id: 'js-1', jobId: 'job-1', masterDataId: 'skill-1' },
            { id: 'js-2', jobId: 'job-1', masterDataId: 'skill-3' },
          ],
        },
      ],
      profile,
      { 'job-1': 42 },
    );

    expect(ranked.type).toBe('JOB');
    // semantic: (0.45-0.25)/(0.75-0.25)=0.4 -> 40*.90=36
    // qualification: job has no requirement (educationLevelIds=[]) -> 100*.10=10
    // 36+10=46
    expect(ranked.matchScore).toBe(46);
  });

  it('scores events with weighted category/tag/location/boost criteria', () => {
    const [ranked] = service.rankEvents(
      [
        {
          id: 'evt-1',
          organizationId: 'org-1',
          title: 'Career Fair',
          description: null,
          categoryId: 'cat-1',
          mode: 'OFFLINE',
          locationId: 'city-1',
          meetingUrl: null,
          isMeetingUrlPublished: false,
          registrationType: 'INTERNAL',
          externalRegistrationUrl: null,
          capacity: null,
          startDate: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)),
          endDate: null,
          status: 'ACTIVE',
          bannerImage: null,
          tagIds: ['tag-1'],
          isFree: true,
          price: null,
          isSponsored: false,
          sponsorCampaignId: null,
          boostScore: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      profile,
      { 'evt-1': 200 },
    );

    expect(ranked.type).toBe('EVENT');
    expect(ranked.matchScore).toBeGreaterThanOrEqual(75);
  });
});
