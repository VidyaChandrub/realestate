import { Campaign, Creative, Event, Job, JobSkill, TargetingRule } from '@prisma/client';

export type FeedUserProfile = {
  id: string;
  userId: string;
  currentCityId: string | null;
  stateId: string | null;
  countryId: string | null;
  highestQualificationId: string | null;
  highestQualificationValue: string | null;
  experienceLevelId: string | null;
  preferredEmploymentTypeId: string[];
  preferredWorkMode: Array<'REMOTE' | 'ONSITE' | 'HYBRID'>;
  totalExperienceMonths: number;
  preferredCategoryIds: string[];
  preferredInterestIds: string[];
  skills: Array<{ masterDataId: string | null }>;
  preferredLocations: Array<{ locationId: string }>;
};

export type FeedJobCandidate = Omit<Job, 'educationLevelId'> & {
  skills: JobSkill[];
  skillIds: string[];
  // Text values of skillIds (in the same order/filtering) — job-detail display data,
  // not used for scoring (skill/qualification fit is now folded into the embedding).
  skillValues?: string[];
  educationLevel?: string | null;
  educationLevelIds: string[];
  educationLevelParentIds: string[];
  educationLevelValues: string[];
  employmentType?: string | null;
  // Embedding cosine similarity (0-1) between this job and the profile, computed
  // upstream in JobsService.getRelevantJobs. Rescaled into 90% of matchScore
  // (JobMatcher.score) — location/experience are hard SQL filters, skill fit lives
  // in the embedding content, and qualification is the other 10% (scored
  // separately, see JobMatcher).
  similarityScore?: number;
};

export type FeedEventCandidate = Event;

export type FeedAdCandidate = Campaign & {
  creatives: Creative[];
  targetingRule: TargetingRule | null;
};

export type FeedCandidateType = 'JOB' | 'EVENT' | 'AD';

export type RankedFeedCandidate = {
  type: FeedCandidateType;
  id: string;
  createdAt: Date;
  matchScore: number;
  engagementScore: number;
  payload: FeedJobCandidate | FeedEventCandidate | FeedAdCandidate;
};
