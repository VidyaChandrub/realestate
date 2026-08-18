import { MasterDataCategoryType } from '@prisma/client';
import { DuplicateSlugException } from '../exceptions/duplicate-slug.exception';
import { InvalidMasterDataHierarchyException } from '../exceptions/invalid-master-data-hierarchy.exception';
import { MasterDataInUseException } from '../exceptions/master-data-in-use.exception';
import { MasterDataNotFoundException } from '../exceptions/master-data-not-found.exception';
import { MasterDataRepository } from '../repositories/master-data.repository';
import { MasterDataReferenceService } from '../services/master-data-reference.service';
import { MasterDataService } from '../services/master-data.service';

const makeCategory = (overrides: Partial<any> = {}) => ({
  id: '11111111-1111-1111-1111-111111111111',
  type: MasterDataCategoryType.JOB_CATEGORY,
  value: 'Clinical Research',
  slug: 'clinical-research',
  description: null,
  parentId: null,
  isActive: true,
  sortOrder: 0,
  metadata: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('MasterDataService', () => {
  let service: MasterDataService;

  const repoMock = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    findAnyBySlug: jest.fn(),
    list: jest.fn(),
    listByType: jest.fn(),
    search: jest.fn(),
    searchCities: jest.fn(),
    slugExists: jest.fn(),
    listChildren: jest.fn(),
    listChildrenByParentAndType: jest.fn(),
    hasAncestor: jest.fn(),
  };

  const refMock = {
    countActiveReferences: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MasterDataService(repoMock as unknown as MasterDataRepository, refMock as unknown as MasterDataReferenceService);
  });

  it('creates master data when slug is unique', async () => {
    repoMock.slugExists.mockResolvedValue(false);
    repoMock.create.mockResolvedValue(makeCategory());

    const result = await service.create({
      type: MasterDataCategoryType.JOB_CATEGORY,
      value: 'Clinical Research',
      slug: 'clinical-research',
    });

    expect(result.slug).toBe('clinical-research');
    expect(repoMock.create).toHaveBeenCalled();
  });

  it('throws DuplicateSlugException when slug exists', async () => {
    repoMock.slugExists.mockResolvedValue(true);

    await expect(
      service.create({
        type: MasterDataCategoryType.JOB_CATEGORY,
        value: 'Clinical Research',
        slug: 'clinical-research',
      }),
    ).rejects.toThrow(DuplicateSlugException);
  });

  it('returns active tree items as id and value pairs', async () => {
    repoMock.listByType.mockResolvedValue([
      makeCategory({ id: 'country-1', type: MasterDataCategoryType.LOCATION_COUNTRY, value: 'India', slug: 'india' }),
      makeCategory({ id: 'state-1', type: MasterDataCategoryType.LOCATION_COUNTRY, parentId: 'country-1', value: 'Karnataka', slug: 'karnataka' }),
    ]);

    const tree = await service.getTree(MasterDataCategoryType.LOCATION_COUNTRY);

    expect(repoMock.listByType).toHaveBeenCalledWith(
      MasterDataCategoryType.LOCATION_COUNTRY,
      true,
    );
    expect(tree).toEqual([
      { id: 'country-1', value: 'India' },
      { id: 'state-1', value: 'Karnataka' },
    ]);
  });

  it('returns a flat list by type without nesting', async () => {
    repoMock.listByType.mockResolvedValue([
      makeCategory({
        id: 'country-1',
        type: MasterDataCategoryType.LOCATION_COUNTRY,
        value: 'India',
        slug: 'india',
      }),
      makeCategory({
        id: 'country-2',
        type: MasterDataCategoryType.LOCATION_COUNTRY,
        value: 'USA',
        slug: 'usa',
      }),
    ]);

    const result = await service.getByType(
      MasterDataCategoryType.LOCATION_COUNTRY,
    );

    expect(result).toHaveLength(2);
    expect(result[0].children).toEqual([]);
    expect(result[1].children).toEqual([]);
  });

  it('searches active city master data by value', async () => {
    repoMock.search.mockResolvedValue([
      makeCategory({
        id: 'city-1',
        type: MasterDataCategoryType.LOCATION_CITY,
        value: 'Bangalore',
        slug: 'bangalore',
      }),
    ]);

    const result = await service.searchCities('ban');

    expect(repoMock.search).toHaveBeenCalledWith({
      value: 'ban',
      type: MasterDataCategoryType.LOCATION_CITY,
      parentId: undefined,
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(MasterDataCategoryType.LOCATION_CITY);
    expect(result[0].value).toBe('Bangalore');
    expect(result[0]).toEqual({
      id: 'city-1',
      type: MasterDataCategoryType.LOCATION_CITY,
      value: 'Bangalore',
      slug: 'bangalore',
      description: null,
      parentId: null,
    });
  });

  it('searches active master data across all types', async () => {
    repoMock.search.mockResolvedValue([
      makeCategory({
        id: 'country-1',
        type: MasterDataCategoryType.LOCATION_COUNTRY,
        value: 'India',
        slug: 'india',
      }),
      makeCategory({
        id: 'skill-1',
        type: MasterDataCategoryType.SKILL,
        value: 'Clinical Research',
        slug: 'clinical-research',
      }),
    ]);

    const result = await service.search('  in  ');

    expect(repoMock.search).toHaveBeenCalledWith({
      value: 'in',
      type: undefined,
      parentId: undefined,
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'country-1',
      type: MasterDataCategoryType.LOCATION_COUNTRY,
      value: 'India',
      slug: 'india',
      description: null,
      parentId: null,
    });
  });

  it('filters search results by parent id when provided', async () => {
    repoMock.search.mockResolvedValue([
      makeCategory({
        id: 'city-1',
        type: MasterDataCategoryType.LOCATION_CITY,
        value: 'Bangalore',
        slug: 'bangalore',
        parentId: 'state-1',
      }),
    ]);

    const result = await service.searchCities('ban', 'state-1');

    expect(repoMock.search).toHaveBeenCalledWith({
      value: 'ban',
      type: MasterDataCategoryType.LOCATION_CITY,
      parentId: 'state-1',
    });
    expect(result[0].parentId).toBe('state-1');
  });

  it('rejects invalid parent type mapping for location state', async () => {
    repoMock.slugExists.mockResolvedValue(false);
    repoMock.findById.mockResolvedValue(makeCategory({ type: MasterDataCategoryType.SKILL }));

    await expect(
      service.create({
        type: MasterDataCategoryType.LOCATION_STATE,
        value: 'Karnataka',
        slug: 'karnataka',
        parentId: 'parent-1',
      }),
    ).rejects.toThrow(InvalidMasterDataHierarchyException);
  });

  it('throws not found when requesting missing id', async () => {
    repoMock.findById.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(MasterDataNotFoundException);
  });

  it('returns active children for a given parent slug and child type', async () => {
    const parent = makeCategory({
      id: 'country-1',
      type: MasterDataCategoryType.LOCATION_COUNTRY,
      slug: 'india',
      value: 'India',
    });
    const child = makeCategory({
      id: 'state-1',
      type: MasterDataCategoryType.LOCATION_STATE,
      slug: 'karnataka',
      value: 'Karnataka',
      parentId: 'country-1',
    });

    repoMock.findAnyBySlug.mockResolvedValue(parent);
    repoMock.listChildrenByParentAndType.mockResolvedValue([child]);

    const result = await service.findChildrenBySlug(
      'india',
      MasterDataCategoryType.LOCATION_STATE,
    );

    expect(repoMock.findAnyBySlug).toHaveBeenCalledWith('india');
    expect(repoMock.listChildrenByParentAndType).toHaveBeenCalledWith(
      'country-1',
      MasterDataCategoryType.LOCATION_STATE,
    );
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('karnataka');
  });

  it('prevents soft delete when referenced by active entities', async () => {
    repoMock.findById.mockResolvedValue(makeCategory());
    refMock.countActiveReferences.mockResolvedValue(3);
    repoMock.listChildren.mockResolvedValue([]);

    await expect(service.softDelete('11111111-1111-1111-1111-111111111111')).rejects.toThrow(MasterDataInUseException);
    expect(refMock.countActiveReferences).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
  });

  it('deactivates category when safe', async () => {
    repoMock.findById.mockResolvedValue(makeCategory());
    refMock.countActiveReferences.mockResolvedValue(0);
    repoMock.listChildren.mockResolvedValue([]);
    repoMock.update.mockResolvedValue(makeCategory({ isActive: false }));

    const result = await service.softDelete('11111111-1111-1111-1111-111111111111');
    expect(result.isActive).toBe(false);
  });

  it('uploads CSV and upserts rows', async () => {
    const existing = makeCategory({ id: 'existing-1', type: MasterDataCategoryType.SKILL, slug: 'ecg' });
    const parent = makeCategory({ id: 'parent-1', type: MasterDataCategoryType.LOCATION_COUNTRY, slug: 'india' });

    repoMock.findBySlug.mockImplementation(async (type: MasterDataCategoryType, slug: string) => {
      if (type === MasterDataCategoryType.SKILL && slug === 'ecg') return existing;
      if (type === MasterDataCategoryType.LOCATION_COUNTRY && slug === 'india') return parent;
      return null;
    });
    repoMock.update.mockResolvedValue(makeCategory({ id: 'existing-1', type: MasterDataCategoryType.SKILL, slug: 'ecg' }));
    repoMock.create.mockResolvedValue(makeCategory({ id: 'new-1', type: MasterDataCategoryType.LOCATION_STATE, slug: 'karnataka', parentId: 'parent-1' }));
    repoMock.findById.mockResolvedValue(parent);

    const csv = [
      'type,value,slug,parentSlug,parentType,sortOrder,isActive,metadataJson',
      'SKILL,ECG,ecg,,,1,true,',
      'LOCATION_STATE,Karnataka,karnataka,india,LOCATION_COUNTRY,2,true,"{\\"priority\\":1}"',
    ].join('\n');

    const result = await service.uploadFromCsv(csv);

    expect(result.totalRows).toBe(2);
    expect(result.updated).toBe(1);
    expect(result.created).toBe(1);
    expect(repoMock.update).toHaveBeenCalled();
    expect(repoMock.create).toHaveBeenCalled();
  });

  it('accepts backslash-escaped metadataJson in CSV', async () => {
    repoMock.findBySlug.mockResolvedValue(null);
    repoMock.create.mockResolvedValue(makeCategory({ id: 'new-2', slug: 'india', type: MasterDataCategoryType.LOCATION_COUNTRY }));

    const csv = [
      'type,value,slug,metadataJson',
      'LOCATION_COUNTRY,India,india,"{\\"iso2\\":\\"IN\\"}"',
    ].join('\n');

    const result = await service.uploadFromCsv(csv);

    expect(result.created).toBe(1);
    expect(repoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ iso2: 'IN' }),
      }),
    );
  });
});
