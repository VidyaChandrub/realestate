import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../reports.service';
import { ReportsRepository } from '../reports.repository';

const mockRepository = {
  getOthersSpecializationsReport: jest.fn(),
  getOthersSpecializationsExport: jest.fn(),
  getCategoriesByIds: jest.fn(),
};

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: ReportsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('slug generation', () => {
    it('generates lowercase underscore slug and trims underscores', () => {
      const { toReportSlug } = require('../utils/slug.util');

      expect(toReportSlug('Biology')).toBe('biology');
      expect(toReportSlug('Computer Science')).toBe('computer_science');
      expect(toReportSlug('Data  Analytics')).toBe('data_analytics');
      expect(toReportSlug('  Machine Learning Engineer  ')).toBe('machine_learning_engineer');
      expect(toReportSlug('___Lead__Dev___')).toBe('lead_dev');
    });
  });

  describe('grouping and aggregation', () => {
    it('aggregates same specialization values case-insensitively and counts usage', async () => {
      mockRepository.getOthersSpecializationsReport.mockResolvedValue([
        { customSpecialization: 'Biology', highestQualificationId: 'q1' },
        { customSpecialization: 'biology', highestQualificationId: 'q1' },
        { customSpecialization: 'BIOLOGY', highestQualificationId: 'q1' },
        { customSpecialization: 'Data Science', highestQualificationId: 'q2' },
      ]);
      mockRepository.getCategoriesByIds.mockResolvedValue([
        { id: 'q1', value: 'B.Sc' },
        { id: 'q2', value: 'B.Tech' },
      ]);

      const result = await service.getOthersSpecializationsReport({ page: 1, limit: 20 });

      expect(result.total).toBe(2);
      expect(result.items).toEqual([
        {
          value: 'Biology',
          type: 'SPECIALIZATION',
          slug: 'biology',
          parent: 'B.Sc',
          parentId: 'q1',
          usageCount: 3,
        },
        {
          value: 'Data Science',
          type: 'SPECIALIZATION',
          slug: 'data_science',
          parent: 'B.Tech',
          parentId: 'q2',
          usageCount: 1,
        },
      ]);
    });

    it('supports search filtering in report repository query', async () => {
      mockRepository.getOthersSpecializationsReport.mockResolvedValue([
        { customSpecialization: 'Bio Science', highestQualificationId: 'q1' },
      ]);
      mockRepository.getCategoriesByIds.mockResolvedValue([{ id: 'q1', value: 'B.Sc' }]);

      await service.getOthersSpecializationsReport({ search: 'bio', page: 1, limit: 20 });

      expect(mockRepository.getOthersSpecializationsReport).toHaveBeenCalledWith('bio');
    });
  });

  describe('CSV generation', () => {
    it('exports grouped rows as CSV with proper master data import headers', async () => {
      mockRepository.getOthersSpecializationsExport.mockResolvedValue([
        { customSpecialization: 'Biology', highestQualificationId: 'q1' },
        { customSpecialization: 'biology', highestQualificationId: 'q1' },
        { customSpecialization: 'Data Science', highestQualificationId: 'q2' },
      ]);
      mockRepository.getCategoriesByIds.mockResolvedValue([
        { id: 'q1', value: 'B.Sc' },
        { id: 'q2', value: 'B.Tech' },
      ]);

      const csv = await service.exportOthersSpecializationsCsv();

      expect(csv).toContain('value,type,slug,parentSlug,parentType');
      expect(csv).toContain('Biology,SPECIALIZATION,biology,bsc,EDUCATION_LEVEL');
      expect(csv).toContain('Data Science,SPECIALIZATION,data_science,btech,EDUCATION_LEVEL');
    });
  });

  describe('pagination', () => {
    it('applies page and limit correctly', async () => {
      mockRepository.getOthersSpecializationsReport.mockResolvedValue([
        { customSpecialization: 'Alpha', highestQualificationId: null },
        { customSpecialization: 'Beta', highestQualificationId: null },
        { customSpecialization: 'Gamma', highestQualificationId: null },
      ]);
      mockRepository.getCategoriesByIds.mockResolvedValue([]);

      const result = await service.getOthersSpecializationsReport({ page: 2, limit: 1 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(1);
      expect(result.items.length).toBe(1);
      expect(result.total).toBe(3);
    });
  });
});
