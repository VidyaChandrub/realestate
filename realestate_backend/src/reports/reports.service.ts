import { Injectable } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';
import { ListOthersSpecializationsDto } from './dto/list-others-specializations.dto';
import { PaginatedOthersSpecializationReportDto } from './dto/paginated-others-specialization-report.dto';
import { SyncOthersSpecializationsResponseDto } from './dto/sync-others-specializations-response.dto';
import { SyncStatusDto } from './dto/sync-status.dto';
import { toReportSlug } from './utils/slug.util';
import { Logger } from '@nestjs/common';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly reportsRepository: ReportsRepository) {}

  async syncImportedSpecializations(): Promise<SyncOthersSpecializationsResponseDto> {
    const updatedCount = await this.reportsRepository.syncImportedSpecializations();

    try {
      await this.reportsRepository.createSyncHistory(updatedCount);
    } catch (error) {
      this.logger.error(
        'Failed to save specialization sync history',
        error instanceof Error ? error.stack : String(error),
      );
    }

    this.logger.log(
      `Successfully synchronized ${updatedCount} user education records with imported specializations`,
    );

    return {
      updatedCount,
    };
  }

  async getSyncStatus(): Promise<SyncStatusDto> {
    const latestHistory = await this.reportsRepository.getLatestSyncHistory();

    return {
      lastSyncDate: latestHistory?.syncedAt ?? null,
      lastSyncUpdatedCount: latestHistory?.updatedCount ?? null,
    };
  }

  async getOthersSpecializationsReport(
    query: ListOthersSpecializationsDto,
  ): Promise<PaginatedOthersSpecializationReportDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim() ?? undefined;

    const { rows, total } = await this.reportsRepository.getOthersSpecializationsReport(
      search,
      page,
      limit,
    );

    const parentIds = Array.from(
      new Set(rows.map((row) => row.parentId).filter((id): id is string => Boolean(id))),
    );
    const categories = parentIds.length
      ? await this.reportsRepository.getCategoriesByIds(parentIds)
      : [];
    const parentValueById = new Map(categories.map((category) => [category.id, category.value]));

    const items = rows.map((row) => ({
      value: row.value,
      type: 'SPECIALIZATION',
      slug: toReportSlug(row.value),
      parent: row.parentId ? parentValueById.get(row.parentId) ?? '' : '',
      parentId: row.parentId ?? null,
      usageCount: Number(row.usageCount),
    }));

    return {
      items,
      page,
      limit,
      total,
    };
  }

  async exportOthersSpecializationsCsv(search?: string): Promise<string> {
    const rows = await this.reportsRepository.getOthersSpecializationsExport(
      search?.trim() ?? undefined,
    );

    const parentIds = Array.from(
      new Set(rows.map((row) => row.parentId).filter((id): id is string => Boolean(id))),
    );
    const categories = parentIds.length
      ? await this.reportsRepository.getCategoriesByIds(parentIds)
      : [];
    const parentSlugById = new Map(categories.map((category) => [category.id, category.slug]));

    const outputRows = rows.map((row) => ({
      value: row.value,
      type: 'SPECIALIZATION',
      slug: toReportSlug(row.value),
      parentSlug: row.parentId ? parentSlugById.get(row.parentId) ?? '' : '',
      parentType: 'EDUCATION_LEVEL',
      status: 'ACTIVE',
    }));

    const header = ['value', 'type', 'slug', 'parentSlug', 'parentType', 'status'];
    const csvLines = [header.join(',')];

    const lineRows = outputRows.map((row) =>
      [row.value, row.type, row.slug, row.parentSlug, row.parentType, row.status]
        .map((field) => this.escapeCsvValue(field))
        .join(','),
    );

    return [...csvLines, ...lineRows].join('\n');
  }

  private escapeCsvValue(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
