import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOthersSpecializationsReport(search: string | undefined, page: number, limit: number): Promise<{
    rows: Array<{
      value: string;
      parentId: string | null;
      usageCount: bigint;
    }>;
    total: number;
  }> {
    const searchTerm = search?.trim();
    const offset = (page - 1) * limit;

    const rows = await this.prisma.$queryRaw<
      Array<{ value: string; parentId: string | null; usageCount: bigint }>
    >`
      SELECT
        MIN(TRIM(ed.custom_specialization)) AS "value",
        ed.highest_qualification_id AS "parentId",
        COUNT(*)::bigint AS "usageCount"
      FROM "users"."education_details" ed
      WHERE LOWER(TRIM(ed.specialization)) = 'others'
        AND ed.custom_specialization IS NOT NULL
        AND TRIM(ed.custom_specialization) <> ''
      ${searchTerm
        ? Prisma.sql`AND LOWER(TRIM(ed.custom_specialization)) LIKE '%' || LOWER(TRIM(${searchTerm})) || '%'`
        : Prisma.empty}
      GROUP BY
        regexp_replace(TRIM(LOWER(ed.custom_specialization)), '\\s+', ' ', 'g'),
        ed.highest_qualification_id
      ORDER BY "usageCount" DESC, "value" ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const totalResult = await this.prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) AS "total"
      FROM (
        SELECT 1
        FROM "users"."education_details" ed
        WHERE LOWER(TRIM(ed.specialization)) = 'others'
          AND ed.custom_specialization IS NOT NULL
          AND TRIM(ed.custom_specialization) <> ''
        ${searchTerm
          ? Prisma.sql`AND LOWER(TRIM(ed.custom_specialization)) LIKE '%' || LOWER(TRIM(${searchTerm})) || '%'`
          : Prisma.empty}
        GROUP BY
          regexp_replace(TRIM(LOWER(ed.custom_specialization)), '\\s+', ' ', 'g'),
          ed.highest_qualification_id
      ) AS grouped_rows
    `;

    return {
      rows,
      total: Number(totalResult?.[0]?.total ?? 0),
    };
  }

  async getOthersSpecializationsExport(search?: string): Promise<
    Array<{ value: string; parentId: string | null; usageCount: bigint }>
  > {
    const searchTerm = search?.trim();

    return this.prisma.$queryRaw<
      Array<{ value: string; parentId: string | null; usageCount: bigint }>
    >`
      SELECT
        MIN(TRIM(ed.custom_specialization)) AS "value",
        ed.highest_qualification_id AS "parentId",
        COUNT(*)::bigint AS "usageCount"
      FROM "users"."education_details" ed
      WHERE LOWER(TRIM(ed.specialization)) = 'others'
        AND ed.custom_specialization IS NOT NULL
        AND TRIM(ed.custom_specialization) <> ''
      ${searchTerm
        ? Prisma.sql`AND LOWER(TRIM(ed.custom_specialization)) LIKE '%' || LOWER(TRIM(${searchTerm})) || '%'`
        : Prisma.empty}
      GROUP BY
        regexp_replace(TRIM(LOWER(ed.custom_specialization)), '\\s+', ' ', 'g'),
        ed.highest_qualification_id
      ORDER BY "usageCount" DESC, "value" ASC
    `;
  }

  async getCategoriesByIds(ids: string[]): Promise<Array<{ id: string; value: string; slug: string }>> {
    if (ids.length === 0) {
      return [];
    }

    return this.prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, value: true, slug: true },
    });
  }

  async createSyncHistory(updatedCount: number): Promise<void> {
    await this.prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "reports"."specialization_sync_history" ("updated_count")
        VALUES (${updatedCount})
      `,
    );
  }

  async getLatestSyncHistory(): Promise<{
    syncedAt: Date;
    updatedCount: number;
  } | null> {
    const result = await this.prisma.$queryRaw<
      Array<{ synced_at: Date; updated_count: number }>
    >`
      SELECT synced_at, updated_count
      FROM "reports"."specialization_sync_history"
      ORDER BY synced_at DESC
      LIMIT 1
    `;

    if (!result?.[0]) {
      return null;
    }

    return {
      syncedAt: result[0].synced_at,
      updatedCount: Number(result[0].updated_count),
    };
  }

  /**
   * Synchronizes user education records where specialization = 'OTHERS'
   * with matching imported SPECIALIZATION master data.
   *
   * Schema context:
   * - Education records live in users.education_details (mapped via Prisma)
   * - Master data specializations live in master_data.categories
   *
   * For each education record with:
   * - specialization = 'OTHERS' (case-insensitive)
   * - custom_specialization NOT NULL and NOT empty (trimmed)
   *
   * If a matching ACTIVE SPECIALIZATION exists in categories with:
   * - type = 'SPECIALIZATION'
   * - status = 'ACTIVE' (ensures only imported specializations are synced)
   * - parent_id = education.highest_qualification_id (no cross-qualification updates)
   * - normalized value matches custom_specialization (LOWER + TRIM)
   *
   * Then updates the education record:
   * - specialization := category.value
   * - custom_specialization := NULL
   *
   * Note: Education model has NO updatedAt field, so we don't set it.
   *
   * Uses a single SQL UPDATE statement for performance (handles thousands of rows).
   *
   * @returns The number of education records updated
   */
  async syncImportedSpecializations(): Promise<number> {
    const result = await this.prisma.$executeRaw`
      UPDATE "users"."education_details" ed
      SET
        specialization = mc.value,
        custom_specialization = NULL
      FROM "master_data"."categories" mc
      WHERE
        LOWER(TRIM(ed.specialization)) = 'others'
        AND ed.custom_specialization IS NOT NULL
        AND TRIM(ed.custom_specialization) <> ''
        AND mc.type = 'SPECIALIZATION'
        AND mc.status = 'ACTIVE'
        AND mc.parent_id = ed.highest_qualification_id
        AND LOWER(TRIM(mc.value)) = LOWER(TRIM(ed.custom_specialization))
    `;

    return result;
  }
}

