import { JobsService } from '../services/jobs.service';

describe('JobsService relevant jobs', () => {
  const setup = () => {
    const jobsRepository = {} as any;
    const jobExternalClicksRepository = {} as any;
    const prisma = {
      $queryRaw: jest.fn(),
      job: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      organization: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      category: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      employerUser: {
        findFirst: jest.fn(),
      },
    } as any;
    const userService = {
      findOrCreateProfile: jest.fn().mockResolvedValue({
        id: 'profile-1',
        userId: 'kc-user-id',
      }),
    } as any;
    const eventEmitter = { emit: jest.fn() } as any;

    return {
      prisma,
      userService,
      service: new JobsService(
        jobsRepository,
        jobExternalClicksRepository,
        prisma,
        userService,
        eventEmitter,
      ),
    };
  };

  it('returns relevant jobs ordered by recency and honors offset', async () => {
    const { service, prisma } = setup();

    prisma.$queryRaw
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([
        { id: 'job-2', similarityScore: 0 },
        { id: 'job-1', similarityScore: 0 },
      ])
      .mockResolvedValueOnce([
        { jobId: 'job-2', educationLevels: 'GNM' },
      ]);

    prisma.job.findMany.mockResolvedValue([
      {
        id: 'job-1',
        organizationId: 'org-1',
        organizationName: null,
        title: 'Staff Nurse',
        description: 'Desc 1',
        summary: 'Summary 1',
        categoryId: 'cat-1',
        locationId: 'loc-1',
        minExperienceMonths: 12,
        maxExperienceMonths: 36,
        experienceLevelId: 'exp-1',
        educationLevelId: 'edu-1',
        workMode: 'ONSITE',
        salaryMin: 10000,
        salaryMax: 20000,
        employmentTypeId: 'emp-1',
        jobType: 'INTERNAL',
        externalUrl: null,
        status: 'ACTIVE',
        publishedAt: new Date('2026-03-10T00:00:00.000Z'),
        expiresAt: null,
        rejectionReason: null,
        createdAt: new Date('2026-03-09T00:00:00.000Z'),
        updatedAt: new Date('2026-03-09T00:00:00.000Z'),
        backgroundImage: null,
        location: { value: 'Bengaluru' },
        category: { value: 'Nursing' },
        employmentType: { value: 'Full Time' },
        experienceLevel: { value: 'Mid Level' },
        educationLevel: { value: 'BSc Nursing' },
        skills: [{ id: 'skill-row-1', jobId: 'job-1', masterDataId: 'skill-1' }],
      },
      {
        id: 'job-2',
        organizationId: 'org-2',
        organizationName: 'Hospital B',
        title: 'ICU Nurse',
        description: 'Desc 2',
        summary: 'Summary 2',
        categoryId: 'cat-2',
        locationId: 'loc-2',
        minExperienceMonths: 24,
        maxExperienceMonths: 60,
        experienceLevelId: 'exp-2',
        educationLevelId: 'edu-2',
        workMode: 'HYBRID',
        salaryMin: 20000,
        salaryMax: 40000,
        employmentTypeId: 'emp-2',
        jobType: 'INTERNAL',
        externalUrl: null,
        status: 'ACTIVE',
        publishedAt: new Date('2026-03-11T00:00:00.000Z'),
        expiresAt: null,
        rejectionReason: null,
        createdAt: new Date('2026-03-10T00:00:00.000Z'),
        updatedAt: new Date('2026-03-10T00:00:00.000Z'),
        backgroundImage: null,
        location: { value: 'Mysuru' },
        category: { value: 'Critical Care' },
        employmentType: { value: 'Contract' },
        experienceLevel: { value: 'Senior' },
        educationLevel: { value: 'GNM' },
        skills: [{ id: 'skill-row-2', jobId: 'job-2', masterDataId: 'skill-2' }],
      },
    ]);

    prisma.category.findMany.mockResolvedValue([
      { id: 'skill-1', value: 'ICU' },
      { id: 'skill-2', value: 'Ventilator' },
    ]);
    prisma.organization.findMany.mockResolvedValue([
      { id: 'org-1', name: 'Hospital A' },
    ]);

    const result = await service.getRelevantJobs(
      { userId: 'kc-user-id' },
      { limit: 20, offset: 5 },
    );

    expect(result.total).toBe(2);
    expect(result.jobs.map((job) => job.id)).toEqual(['job-2', 'job-1']);
    expect(result.jobs[0]).toMatchObject({
      id: 'job-2',
      organizationName: 'Hospital B',
      locationName: 'Mysuru',
      categoryName: 'Critical Care',
      employmentTypeName: 'Contract',
      experienceLevelName: 'Senior',
      educationLevel: 'GNM',
      skills: ['Ventilator'],
      similarityScore: 0,
      jobSkills: [{ id: 'skill-row-2', jobId: 'job-2', masterDataId: 'skill-2' }],
    });
    expect(result.jobs[1]).toMatchObject({
      id: 'job-1',
      organizationName: 'Hospital A',
    });
    expect(prisma.organization.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['org-1'] },
      },
      select: {
        id: true,
        name: true,
      },
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
  });
});
