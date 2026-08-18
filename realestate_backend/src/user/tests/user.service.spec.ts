import { UserService } from '../user.service';

describe('UserService', () => {
  const masterDataId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const buildProfile = (overrides: Record<string, unknown> = {}) => ({
    id: 'profile-1',
    userId: 'kc-user-id',
    fullName: null,
    gender: null,
    mobileNumber: null,
    currentCityId: null,
    stateId: null,
    countryId: null,
    pincode: null,
    preferredEmploymentTypeId: null,
    preferredWorkMode: null,
    shiftPreference: null,
    availableJoiningDate: null,
    profileCompletionPercentage: 0,
    bio: null,
    jobTitle: null,
    highestQualificationId: null,
    education: [],
    experience: [],
    preferredLocations: [],
    skills: [],
    documents: [],
    ...overrides,
  });

  const setup = () => {
    const tx = {
      profile: {
        update: jest.fn().mockResolvedValue({ id: 'profile-1' }),
      },
      education: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      professionalExperience: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      userPreferredLocation: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      userSkill: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const prisma = {
      $transaction: jest.fn(async (callback: (transactionClient: typeof tx) => Promise<unknown>) => callback(tx)),
      $queryRaw: jest.fn(),
      category: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      job: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      profile: {
        findUnique: jest.fn().mockResolvedValue(buildProfile()),
        update: jest.fn().mockResolvedValue(buildProfile()),
        count: jest.fn().mockResolvedValue(2),
      },
      userSkill: {
        count: jest.fn().mockResolvedValue(3),
      },
      userPreferredLocation: {
        count: jest.fn().mockResolvedValue(4),
      },
    };

    return {
      tx,
      prisma,
      service: new UserService(prisma as any),
    };
  };

  it('recalculates totalExperienceMonths and relevantExperienceMonths after experience replacement', async () => {
    const { service, tx, prisma } = setup();

    tx.professionalExperience.findMany.mockResolvedValue([
      {
        yearsOfExperience: 2,
        monthsOfExperience: 6,
        relevantYears: 1,
        relevantMonths: 2,
      },
      {
        yearsOfExperience: 1,
        monthsOfExperience: 3,
        relevantYears: null,
        relevantMonths: null,
      },
    ]);
    prisma.profile.findUnique.mockResolvedValue(
      buildProfile({
        experience: [{ id: 'exp-1' }],
      }),
    );

    await service.updateProfile('kc-user-id', {
      experience: [
        {
          jobTitle: 'Nurse',
          companyName: 'A Hospital',
          yearsOfExperience: 2,
          monthsOfExperience: 6,
          relevantYears: 1,
          relevantMonths: 2,
          employmentStatus: 'FULL_TIME',
        },
      ],
    });

    expect(tx.professionalExperience.deleteMany).toHaveBeenCalledWith({ where: { profileId: 'profile-1' } });
    expect(tx.professionalExperience.createMany).toHaveBeenCalled();
    expect(tx.profile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: {
        totalExperienceMonths: 45,
        relevantExperienceMonths: 14,
      },
    });
  });

  it('stores relevantExperienceMonths as null when no relevant experience values exist', async () => {
    const { service, tx, prisma } = setup();

    tx.professionalExperience.findMany.mockResolvedValue([
      {
        yearsOfExperience: 3,
        monthsOfExperience: 0,
        relevantYears: null,
        relevantMonths: null,
      },
    ]);
    prisma.profile.findUnique.mockResolvedValue(
      buildProfile({
        experience: [{ id: 'exp-1' }],
      }),
    );

    await service.updateProfile('kc-user-id', {
      experience: [
        {
          jobTitle: 'Technician',
          companyName: 'B Clinic',
          yearsOfExperience: 3,
          monthsOfExperience: 0,
          employmentStatus: 'FULL_TIME',
        },
      ],
    });

    expect(tx.profile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: {
        totalExperienceMonths: 36,
        relevantExperienceMonths: null,
      },
    });
  });

  it('syncs preferred locations as deduplicated relational rows', async () => {
    const { service, tx, prisma } = setup();

    prisma.profile.findUnique.mockResolvedValue(
      buildProfile({
        preferredLocations: [
          { locationId: '11111111-1111-1111-1111-111111111111' },
        ],
      }),
    );

    await service.updateProfile('kc-user-id', {
      preferredLocationIds: [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
      ],
    });

    expect(tx.userPreferredLocation.deleteMany).toHaveBeenCalledWith({
      where: { profileId: 'profile-1' },
    });

    expect(tx.userPreferredLocation.createMany).toHaveBeenCalledWith({
      data: [
        { profileId: 'profile-1', locationId: '11111111-1111-1111-1111-111111111111' },
        { profileId: 'profile-1', locationId: '22222222-2222-2222-2222-222222222222' },
      ],
    });
  });

  it('calculates profile completion percentage from persisted profile data', async () => {
    const { service, prisma } = setup();

    prisma.profile.findUnique.mockResolvedValue(
      buildProfile({
        fullName: 'Test User',
        gender: 'female',
        mobileNumber: '9999999999',
        currentCityId: 'city-id',
        stateId: 'state-id',
        countryId: 'country-id',
        pincode: '560001',
        education: [{ id: 'edu-1', degreeName: 'B.Tech' }],
        experience: [{ id: 'exp-1', jobTitle: 'Engineer', companyName: 'Acme' }],
        skills: [{ id: 'skill-1' }],
        preferredEmploymentTypeId: 'employment-type-id',
        preferredWorkMode: 'HYBRID',
        shiftPreference: 'DAY',
        availableJoiningDate: new Date('2026-04-01T00:00:00.000Z'),
        preferredLocations: [{ locationId: 'pref-city-id' }],
      }),
    );

    const profile = await service.updateProfile('kc-user-id', {
      profileCompletionPercentage: 100,
    });

    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { profileCompletionPercentage: 100 },
    });
    expect(profile?.profileCompletionPercentage).toBe(100);
  });

  it('does not award incomplete sections in strict mode', async () => {
    const { service, prisma } = setup();

    prisma.profile.findUnique.mockResolvedValue(
      buildProfile({
        fullName: 'Test User',
        gender: 'male',
        mobileNumber: '8888888888',
        currentCityId: 'city-id',
        education: [{ id: 'edu-1' }],
        experience: [{ id: 'exp-1', jobTitle: 'Engineer' }],
        skills: [{ id: 'skill-1' }],
      }),
    );

    const profile = await service.updateProfile('kc-user-id', {});

    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { profileCompletionPercentage: 35 },
    });
    expect(profile?.profileCompletionPercentage).toBe(35);
  });

  it('does not award basic info when mobile number is missing', async () => {
    const { service, prisma } = setup();

    prisma.profile.findUnique.mockResolvedValue(
      buildProfile({
        fullName: 'Test User',
        gender: 'male',
        currentCityId: 'city-id',
        education: [{ id: 'edu-1', highestQualificationId: 'qualification-id' }],
        experience: [{ id: 'exp-1', jobTitle: 'Engineer', companyName: 'Acme' }],
        skills: [{ id: 'skill-1' }],
        preferredEmploymentTypeId: 'employment-type-id',
        preferredWorkMode: 'ONSITE',
        shiftPreference: 'DAY',
        availableJoiningDate: new Date('2026-04-01T00:00:00.000Z'),
        preferredLocations: [{ locationId: 'pref-city-id' }],
      }),
    );

    const profile = await service.updateProfile('kc-user-id', {});

    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { profileCompletionPercentage: 55 },
    });
    expect(profile?.profileCompletionPercentage).toBe(55);
  });

  it('counts master-data references from profile fields, skills, and preferred locations', async () => {
    const { service, prisma } = setup();

    const count = await service.countByMasterDataId(masterDataId);

    expect(count).toBe(9);
    expect(prisma.profile.count).toHaveBeenCalledWith({
      where: {
        isActive: true,
        OR: [
          { countryId: masterDataId },
          { stateId: masterDataId },
          { currentCityId: masterDataId },
          { highestQualificationId: masterDataId },
          { experienceLevelId: masterDataId },
          { preferredEmploymentTypeId: masterDataId },
          { preferredCategoryIds: { has: masterDataId } },
          { preferredInterestIds: { has: masterDataId } },
        ],
      },
    });
    expect(prisma.userSkill.count).toHaveBeenCalled();
    expect(prisma.userPreferredLocation.count).toHaveBeenCalledWith({
      where: {
        locationId: masterDataId,
        profile: { isActive: true },
      },
    });
  });

  it('formats profile location ids into master-data values for response payloads', async () => {
    const { service, prisma } = setup();

    prisma.category.findMany.mockResolvedValue([
      { id: 'city-id', value: 'Bengaluru' },
      { id: 'state-id', value: 'Karnataka' },
      { id: 'country-id', value: 'India' },
      { id: 'pref-city-id', value: 'Mysuru' },
    ]);

    const formattedProfile = await service.formatProfileForResponse({
      id: 'profile-1',
      currentCityId: 'city-id',
      stateId: 'state-id',
      countryId: 'country-id',
      preferredLocations: [
        {
          locationId: 'pref-city-id',
        },
        {
          locationId: 'inactive-city-id',
        },
      ],
      fullName: 'Test User',
      preferences: { realm: 'consumer' },
      notificationSettings: { email: true, push: true },
      createdAt: '2026-03-14T12:01:55.449Z',
      updatedAt: '2026-03-15T09:06:49.669Z',
      lastLoginAt: '2026-03-15T09:06:49.666Z',
    });

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['city-id', 'state-id', 'country-id', 'pref-city-id', 'inactive-city-id'],
        },
        isActive: true,
      },
      select: {
        id: true,
        value: true,
      },
    });
    expect(formattedProfile).toEqual({
      id: 'profile-1',
      currentCityId: 'city-id',
      stateId: 'state-id',
      countryId: 'country-id',
      currentCity: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      preferredLocations: [
        {
          locationId: 'pref-city-id',
          location: 'Mysuru',
        },
      ],
      fullName: 'Test User',
    });
    expect(formattedProfile).not.toHaveProperty('preferences');
    expect(formattedProfile).not.toHaveProperty('notificationSettings');
    expect(formattedProfile).not.toHaveProperty('createdAt');
    expect(formattedProfile).not.toHaveProperty('updatedAt');
    expect(formattedProfile).not.toHaveProperty('lastLoginAt');
  });

});
