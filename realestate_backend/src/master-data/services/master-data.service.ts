import { BadRequestException, Injectable } from '@nestjs/common';
import { Category, MasterDataCategoryType, MasterStatus, Prisma } from '@prisma/client';
import { CreateMasterDataDto } from '../dto/create-master-data.dto';
import { ListMasterDataDto } from '../dto/list-master-data.dto';
import { UpdateMasterDataDto } from '../dto/update-master-data.dto';
import { DuplicateSlugException } from '../exceptions/duplicate-slug.exception';
import { InvalidMasterDataHierarchyException } from '../exceptions/invalid-master-data-hierarchy.exception';
import { MasterDataInUseException } from '../exceptions/master-data-in-use.exception';
import { MasterDataNotFoundException } from '../exceptions/master-data-not-found.exception';
import { MasterDataRepository } from '../repositories/master-data.repository';
import { MasterDataReferenceService } from './master-data-reference.service';

const PARENT_TYPE_RULES: Partial<
  Record<MasterDataCategoryType, MasterDataCategoryType[]>
> = {
  [MasterDataCategoryType.LOCATION_COUNTRY]: [],
  [MasterDataCategoryType.LOCATION_STATE]: [
    MasterDataCategoryType.LOCATION_COUNTRY,
  ],
  [MasterDataCategoryType.LOCATION_CITY]: [
    MasterDataCategoryType.LOCATION_STATE,
  ],
  [MasterDataCategoryType.SPECIALIZATION]: [
    MasterDataCategoryType.EDUCATION_LEVEL,
  ],
};

const TYPES_REQUIRING_PARENT = new Set<MasterDataCategoryType>([
  MasterDataCategoryType.SPECIALIZATION,
]);

@Injectable()
export class MasterDataService {
  constructor(
    private readonly masterDataRepository: MasterDataRepository,
    private readonly referenceService: MasterDataReferenceService,
  ) {}

  async create(dto: CreateMasterDataDto) {
    const normalizedValue = dto.value.trim();
    const normalizedSlug = dto.slug.trim().toLowerCase();

    // FIX #1: OTHERS is system-generated — admins must never create it manually
    if (
      dto.type === MasterDataCategoryType.SPECIALIZATION &&
      normalizedValue.toUpperCase() === 'OTHERS'
    ) {
      throw new BadRequestException(
        'OTHERS specialization is system generated and cannot be created manually',
      );
    }

    await this.assertSlugUnique(dto.type, dto.slug);

    let parent: Category | null = null;
    if (dto.parentId) {
      parent = await this.requireCategory(dto.parentId);
      this.assertParentTypeCompatibility(dto.type, parent.type);
    }

    if (dto.type === MasterDataCategoryType.SPECIALIZATION) {
      if (!parent) {
        throw new InvalidMasterDataHierarchyException(
          'SPECIALIZATION must have a parent of type EDUCATION_LEVEL',
        );
      }

      await this.assertTypeValueUniqueUnderParent(
        dto.type,
        normalizedValue,
        parent.id,
      );
    }

    const created = await this.masterDataRepository.create({
      type: dto.type,
      value: normalizedValue,
      slug: normalizedSlug,
      description: dto.description?.trim(),
      parent: parent ? { connect: { id: parent.id } } : undefined,
      sortOrder: dto.sortOrder ?? 0,
      metadata:
        dto.metadata === null
          ? Prisma.JsonNull
          : (dto.metadata as Prisma.InputJsonValue | undefined),
      isActive: true,
      status: dto.status ?? undefined,
    });

    // Auto-create OTHERS sibling for every new SPECIALIZATION entry
    await this.ensureOthersSpecialization(dto.type, parent?.id);

    return this.toEntity(created);
  }

  async update(id: string, dto: UpdateMasterDataDto) {
    const existing = await this.requireCategory(id);
    const nextType = dto.type ?? existing.type;
    const nextValue = dto.value !== undefined ? dto.value.trim() : existing.value;
    const explicitParentProvided = dto.parentId !== undefined;
    let nextParentId = explicitParentProvided ? dto.parentId : existing.parentId;
    let disconnectParent = false;

    if (dto.slug) {
      await this.assertSlugUnique(nextType, dto.slug, existing.id);
    }

    let nextParent: Category | null = null;
    if (nextParentId) {
      if (nextParentId === id) {
        throw new InvalidMasterDataHierarchyException(
          'A node cannot be parent of itself',
        );
      }

      nextParent = await this.requireCategory(nextParentId);
      if (!this.isParentTypeCompatible(nextType, nextParent.type)) {
        if (explicitParentProvided) {
          this.assertParentTypeCompatibility(nextType, nextParent.type);
        } else {
          nextParent = null;
          nextParentId = null;
          disconnectParent = true;
        }
      }

      const wouldCreateCycle = nextParentId
        ? await this.masterDataRepository.hasAncestor(nextParentId, id)
        : false;
      if (wouldCreateCycle) {
        throw new InvalidMasterDataHierarchyException(
          'Updating parent would create a cycle',
        );
      }
    }

    if (nextType === MasterDataCategoryType.SPECIALIZATION) {
      if (!nextParent) {
        throw new InvalidMasterDataHierarchyException(
          'SPECIALIZATION must have a parent of type EDUCATION_LEVEL',
        );
      }

      // FIX #3: Block renaming an existing specialization to 'OTHERS'
      if (
        nextValue.trim().toUpperCase() === 'OTHERS' &&
        existing.value.trim().toUpperCase() !== 'OTHERS'
      ) {
        throw new BadRequestException(
          'OTHERS specialization is system generated and cannot be assigned manually',
        );
      }

      await this.assertTypeValueUniqueUnderParent(
        nextType,
        nextValue,
        nextParent.id,
        existing.id,
      );
    }

    const updated = await this.masterDataRepository.update(id, {
      ...(dto.type ? { type: dto.type } : {}),
      ...(dto.value !== undefined ? { value: nextValue } : {}),
      ...(dto.slug !== undefined
        ? { slug: dto.slug.trim().toLowerCase() }
        : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() ?? null }
        : {}),
      ...(dto.parentId !== undefined
        ? {
            parent:
              dto.parentId === null
                ? { disconnect: true }
                : { connect: { id: dto.parentId } },
          }
        : disconnectParent
          ? { parent: { disconnect: true } }
          : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.metadata !== undefined
        ? {
            metadata:
              dto.metadata === null
                ? Prisma.JsonNull
                : (dto.metadata as Prisma.InputJsonValue),
          }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    return this.toEntity(updated);
  }

  async softDelete(id: string) {
    const existing = await this.requireCategory(id);

    // Protect system-generated OTHERS specializations from deletion
    if (
      existing.type === MasterDataCategoryType.SPECIALIZATION &&
      existing.value.trim().toUpperCase() === 'OTHERS'
    ) {
      throw new BadRequestException(
        'System generated OTHERS specialization cannot be deleted',
      );
    }

    if (!existing.isActive) {
      return this.toEntity(existing);
    }

    const [references, activeChildren] = await Promise.all([
      this.referenceService.countActiveReferences(existing.id),
      this.masterDataRepository.listChildren(existing.id),
    ]);

    if (references > 0) {
      throw new MasterDataInUseException(existing.slug, references);
    }

    if (activeChildren.length > 0) {
      throw new InvalidMasterDataHierarchyException(
        'Cannot deactivate a category that has active children',
      );
    }

    const updated = await this.masterDataRepository.update(id, {
      isActive: false,
    });
    return this.toEntity(updated);
  }

  async hardDelete(id: string) {
    const existing = await this.requireCategory(id);

    // Protect system-generated OTHERS specializations from hard deletion
    if (
      existing.type === MasterDataCategoryType.SPECIALIZATION &&
      existing.value.trim().toUpperCase() === 'OTHERS'
    ) {
      throw new BadRequestException(
        'System generated OTHERS specialization cannot be deleted',
      );
    }

    await this.masterDataRepository.delete(id);
  }

  async findAll(query: ListMasterDataDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { items, total } = await this.masterDataRepository.list({
      type: query.type,
      status: query.status,
      activeOnly: false,
      page,
      limit,
      search: query.search,
    });

    return {
      items: items.map((item) => this.toEntity(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return this.toEntity(await this.requireCategory(id));
  }

  async findBySlug(slug: string, type?: MasterDataCategoryType) {
    if (!type) {
      const match = await this.masterDataRepository.findAnyBySlug(
        slug.toLowerCase(),
      );
      if (!match) {
        throw new MasterDataNotFoundException(slug);
      }

      return this.toEntity(match);
    }

    const found = await this.masterDataRepository.findBySlug(
      type,
      slug.toLowerCase(),
    );
    if (!found) {
      throw new MasterDataNotFoundException(slug);
    }

    return this.toEntity(found);
  }

  async findChildrenBySlug(
    slug: string,
    childType: MasterDataCategoryType,
    type?: MasterDataCategoryType,
  ) {
    const parent = type
      ? await this.masterDataRepository.findBySlug(type, slug.toLowerCase())
      : await this.masterDataRepository.findAnyBySlug(slug.toLowerCase());

    if (!parent) {
      throw new MasterDataNotFoundException(slug);
    }

    const children = await this.masterDataRepository.listChildrenByParentAndType(
      parent.id,
      childType,
    );

    return children.map((child) => this.toEntity(child));
  }

  async getByType(type: MasterDataCategoryType) {
    const nodes = await this.masterDataRepository.listByType(type, true);

    return nodes.map((node) => ({
      ...this.toEntity(node),
      children: [],
    }));
  }

  async search(
    value: string,
    type?: MasterDataCategoryType,
    parentId?: string,
  ) {
    const results = await this.masterDataRepository.search({
      value: value.trim(),
      type,
      parentId,
    });

    return results.map((item) => this.toSearchEntity(item));
  }

  async searchCities(value: string, parentId?: string) {
    return this.search(value, MasterDataCategoryType.LOCATION_CITY, parentId);
  }

  async getTree(type: MasterDataCategoryType) {
    const nodes = await this.masterDataRepository.listByType(type, true);
    return nodes.map((node) => ({
      id: node.id,
      value: node.value,
    }));
  }

  async uploadFromCsv(csvContent: string): Promise<{
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
  }> {
    const rows = this.parseCsv(csvContent);
    if (rows.length === 0) {
      throw new BadRequestException('CSV has no data rows');
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    const inBatch = new Map<string, Category>();

    for (const [index, row] of rows.entries()) {
      const lineNumber = index + 2;
      const type = this.parseType(row.type, lineNumber);
      const value = (row.value ?? '').trim();
      const slug = (row.slug ?? '').trim().toLowerCase();

      if (!value || !slug) {
        skipped += 1;
        continue;
      }

      let parentId: string | null = null;
      const rawParentSlug = (row.parentSlug ?? '').trim().toLowerCase();
      if (type === MasterDataCategoryType.SPECIALIZATION) {
        // FIX #2: Block CSV import of OTHERS — system generates it automatically
        if (value.toUpperCase() === 'OTHERS') {
          throw new BadRequestException(
            'OTHERS specialization is system generated and cannot be imported',
          );
        }

        if (!rawParentSlug) {
          throw new BadRequestException(
            `Row ${lineNumber}: parentSlug is required for SPECIALIZATION`,
          );
        }

        const parentTypeRaw = (row.parentType ?? '').trim().toUpperCase();
        if (parentTypeRaw !== MasterDataCategoryType.EDUCATION_LEVEL) {
          throw new BadRequestException(
            `Row ${lineNumber}: parentType must be EDUCATION_LEVEL for SPECIALIZATION`,
          );
        }
      }

      if (rawParentSlug) {
        const parentType = this.parseType(
          row.parentType || row.type,
          lineNumber,
        );
        const key = `${parentType}:${rawParentSlug}`;
        const parentFromBatch = inBatch.get(key);

        if (parentFromBatch) {
          parentId = parentFromBatch.id;
        } else {
          const parentFromDb = await this.masterDataRepository.findBySlug(
            parentType,
            rawParentSlug,
          );

          if (!parentFromDb) {
            throw new BadRequestException(
              `Row ${lineNumber}: parent not found for slug "${rawParentSlug}" and type "${parentType}"`,
            );
          }

          parentId = parentFromDb.id;
        }
      }

      const sortOrder = row.sortOrder ? Number(row.sortOrder) : 0;
      if (!Number.isFinite(sortOrder) || sortOrder < 0) {
        throw new BadRequestException(
          `Row ${lineNumber}: invalid sortOrder "${row.sortOrder}"`,
        );
      }

      const status = this.parseStatus(row.status, lineNumber);
      const metadata = this.parseMetadata(row.metadataJson, lineNumber);

      this.assertParentTypeCompatibility(
        type,
        parentId ? (await this.requireCategory(parentId)).type : undefined,
      );

      const existing = await this.masterDataRepository.findBySlug(type, slug);
      if (existing) {
        if (type === MasterDataCategoryType.SPECIALIZATION && parentId) {
          const duplicate =
            await this.masterDataRepository.findByTypeValueAndParentId(
              type,
              value,
              parentId,
              existing.id,
            );
          if (duplicate) {
            skipped += 1;
            continue;
          }
        }

        let updatedItem: Category;
        try {
          updatedItem = await this.masterDataRepository.update(existing.id, {
            value,
            description: row.description?.trim() || null,
            parent:
              parentId === null
                ? { disconnect: true }
                : { connect: { id: parentId } },
            sortOrder,
            status,
            metadata:
              metadata === null
                ? Prisma.JsonNull
                : (metadata as Prisma.InputJsonValue),
          });
        } catch (error) {
          // A duplicate (type, parent, value) is an expected outcome for a
          // CSV row, not a server error — skip it and keep processing the
          // remaining rows instead of letting P2002 abort the whole upload.
          if (this.isUniqueConstraintViolation(error)) {
            skipped += 1;
            continue;
          }
          throw error;
        }

        inBatch.set(`${type}:${slug}`, updatedItem);
        updated += 1;
      } else {
        if (type === MasterDataCategoryType.SPECIALIZATION && !parentId) {
          throw new BadRequestException(
            `Row ${lineNumber}: parentSlug is required for SPECIALIZATION`,
          );
        }

        if (type === MasterDataCategoryType.SPECIALIZATION && parentId) {
          const duplicate =
            await this.masterDataRepository.findByTypeValueAndParentId(
              type,
              value,
              parentId,
            );
          if (duplicate) {
            skipped += 1;
            continue;
          }
        }

        let createdItem: Category;
        try {
          createdItem = await this.masterDataRepository.create({
            type,
            value,
            slug,
            description: row.description?.trim() || null,
            parent: parentId ? { connect: { id: parentId } } : undefined,
            sortOrder,
            status,
            metadata:
              metadata === null
                ? Prisma.JsonNull
                : (metadata as Prisma.InputJsonValue | undefined),
          });
        } catch (error) {
          if (this.isUniqueConstraintViolation(error)) {
            skipped += 1;
            continue;
          }
          throw error;
        }

        inBatch.set(`${type}:${slug}`, createdItem);
        created += 1;

        // Auto-create OTHERS sibling for every new SPECIALIZATION imported via CSV
        await this.ensureOthersSpecialization(type, parentId);
      }
    }

    return {
      totalRows: rows.length,
      created,
      updated,
      skipped,
    };
  }

  private async requireCategory(id: string): Promise<Category> {
    const found = await this.masterDataRepository.findById(id);
    if (!found) {
      throw new MasterDataNotFoundException(id);
    }

    return found;
  }

  private async assertSlugUnique(
    type: MasterDataCategoryType,
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const exists = await this.masterDataRepository.slugExists(
      type,
      slug.toLowerCase(),
      excludeId,
    );
    if (exists) {
      throw new DuplicateSlugException(type, slug.toLowerCase());
    }
  }

  private async assertTypeValueUniqueUnderParent(
    type: MasterDataCategoryType,
    value: string,
    parentId: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.masterDataRepository.findByTypeValueAndParentId(
      type,
      value,
      parentId,
      excludeId,
    );

    if (existing) {
      throw new BadRequestException(
        `${type} with value "${value.trim()}" already exists under the same parent`,
      );
    }
  }

  private isParentTypeCompatible(
    type: MasterDataCategoryType,
    parentType?: MasterDataCategoryType,
  ): boolean {
    const allowedParents = PARENT_TYPE_RULES[type];

    if (!parentType) {
      return !TYPES_REQUIRING_PARENT.has(type);
    }

    if (allowedParents && allowedParents.length === 0) {
      return false;
    }

    if (allowedParents) {
      return allowedParents.includes(parentType);
    }

    return parentType === type;
  }

  private assertParentTypeCompatibility(
    type: MasterDataCategoryType,
    parentType?: MasterDataCategoryType,
  ): void {
    const allowedParents = PARENT_TYPE_RULES[type];

    if (!parentType && TYPES_REQUIRING_PARENT.has(type)) {
      throw new InvalidMasterDataHierarchyException(
        `${type} must have a parent of type ${allowedParents?.join(', ') ?? 'a valid parent'}`,
      );
    }

    if (!parentType) {
      if (allowedParents && allowedParents.length === 0) {
        return;
      }
      return;
    }

    if (allowedParents && allowedParents.length === 0) {
      throw new InvalidMasterDataHierarchyException(
        `${type} cannot have a parent`,
      );
    }

    if (allowedParents && !allowedParents.includes(parentType)) {
      throw new InvalidMasterDataHierarchyException(
        `Invalid parent type. ${type} can only have parents of type: ${allowedParents.join(', ')}`,
      );
    }

    if (!allowedParents && parentType !== type) {
      throw new InvalidMasterDataHierarchyException(
        `Invalid parent type. ${type} can only have parent of the same type`,
      );
    }
  }

  private parseType(
    raw: string | undefined,
    lineNumber: number,
  ): MasterDataCategoryType {
    if (!raw) {
      throw new BadRequestException(`Row ${lineNumber}: type is required`);
    }

    const normalized = raw.trim().toUpperCase();
    const type = Object.values(MasterDataCategoryType).find(
      (candidate): candidate is MasterDataCategoryType => candidate === normalized,
    );
    if (!type) {
      throw new BadRequestException(`Row ${lineNumber}: invalid type "${raw}"`);
    }

    return type;
  }

  private parseStatus(
    raw: string | undefined,
    lineNumber: number,
  ): MasterStatus {
    if (!raw || raw.trim() === '') {
      return MasterStatus.DRAFT;
    }

    const normalized = raw.trim().toUpperCase();
    const validStatuses: MasterStatus[] = [
      MasterStatus.ACTIVE,
      MasterStatus.DRAFT,
      MasterStatus.INACTIVE,
    ];

    if (!validStatuses.includes(normalized as MasterStatus)) {
      throw new BadRequestException(
        `Row ${lineNumber}: invalid status "${raw}"`,
      );
    }

    return normalized as MasterStatus;
  }

  private parseMetadata(
    raw: string | undefined,
    lineNumber: number,
  ): Prisma.InputJsonValue | null {
    if (!raw || raw.trim() === '') {
      return null;
    }

    try {
      let normalized = raw.trim();

      // Accept both RFC-style CSV escaped JSON ("{""k"":""v""}") and
      // backslash-escaped JSON ("{\"k\":\"v\"}") from spreadsheet exports.
      normalized = normalized.replace(/\\"/g, '"');
      if (
        normalized.startsWith('"') &&
        normalized.endsWith('"') &&
        normalized.length >= 2
      ) {
        normalized = normalized.slice(1, -1);
      }

      const parsed = JSON.parse(normalized);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error('metadataJson must be a JSON object');
      }
      return parsed as Prisma.InputJsonValue;
    } catch (error) {
      throw new BadRequestException(
        `Row ${lineNumber}: invalid metadataJson. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private parseCsv(csvContent: string): Array<{
    type?: string;
    value?: string;
    slug?: string;
    description?: string;
    parentSlug?: string;
    parentType?: string;
    status?: string;
    sortOrder?: string;
    metadataJson?: string;
  }> {
    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return [];
    }

    const header = this.parseCsvLine(lines[0]).map((h) => h.trim());
    const required = ['type', 'value', 'slug'];

    // ===== TEMPORARY DEBUG LOGGING (remove after root cause is confirmed) =====
    const rawFirstLine = csvContent.split(/\r?\n/)[0] ?? '';
    console.log('='.repeat(50));
    console.log('CSV CONTENT:');
    console.log(csvContent);
    console.log('='.repeat(50));
    console.log('First 200 characters of csvContent:');
    console.log(JSON.stringify(csvContent.slice(0, 200)));
    console.log('Raw first line (before trim/split):');
    console.log(JSON.stringify(rawFirstLine));
    console.log('Parsed Header:');
    console.log(JSON.stringify(header));
    console.log('Header[0]:');
    console.log(header[0]);
    console.log('Character Codes of header[0]:');
    console.log(
      header[0] ? header[0].split('').map((c) => c.charCodeAt(0)) : [],
    );
    console.log('Has type:', header.includes('type'));
    console.log('Required:', JSON.stringify(required));
    console.log('Total parsed lines:', lines.length);
    console.log('='.repeat(50));
    // ===== END TEMPORARY DEBUG LOGGING =====

    for (const col of required) {
      if (!header.includes(col)) {
        throw new BadRequestException(
          `CSV header missing required column "${col}"`,
        );
      }
    }

    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i += 1) {
      const values = this.parseCsvLine(lines[i]);
      const row: Record<string, string> = {};
      for (let j = 0; j < header.length; j += 1) {
        row[header[j]] = values[j] ?? '';
      }
      rows.push(row);
    }

    return rows.map((row) => ({
      type: row.type,
      value: row.value,
      slug: row.slug,
      description: row.description,
      parentSlug: row.parentSlug,
      parentType: row.parentType,
      status: row.status,
      sortOrder: row.sortOrder,
      metadataJson: row.metadataJson,
    }));
  }

  private parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i > 0 && line[i - 1] === '\\') {
          // Keep quote char when input uses backslash escapes.
          current += '"';
          continue;
        }
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        out.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    out.push(current);
    return out;
  }

  private toEntity(item: Category) {
    return {
      id: item.id,
      type: item.type,
      value: item.value,
      slug: item.slug,
      description: item.description,
      parentId: item.parentId,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
      metadata: (item.metadata as Record<string, unknown> | null) ?? null,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private toSearchEntity(item: Category) {
    return {
      id: item.id,
      type: item.type,
      value: item.value,
      slug: item.slug,
      description: item.description,
      parentId: item.parentId,
    };
  }

  private toCitySearchEntity(item: Category) {
    return this.toSearchEntity(item);
  }

  /**
   * Ensures that exactly one OTHERS specialization exists under the given
   * parent qualification. Idempotent and race-condition safe.
   * Race safety is guaranteed by the database functional unique index
   * uq_master_data_category_type_parent_value_normalized,
   * which enforces case-insensitive trimmed uniqueness under the same parent.
   * Only acts when type === SPECIALIZATION and a parentId is present.
   *
   * New OTHERS rows are created as ACTIVE with a human-readable slug derived
   * from the parent EDUCATION_LEVEL value (e.g. others-bsc).
   * OTHERS creation is wrapped in try/catch so a concurrent request that wins
   * the insert race does not surface as an error to the caller.
   */
  private async ensureOthersSpecialization(
    type: MasterDataCategoryType,
    parentId?: string | null,
  ): Promise<void> {
    if (type !== MasterDataCategoryType.SPECIALIZATION || !parentId) {
      return;
    }

    const existing = await this.masterDataRepository.findByTypeValueAndParentId(
      MasterDataCategoryType.SPECIALIZATION,
      'OTHERS',
      parentId,
    );

    if (existing) {
      // OTHERS already present — nothing to do
      return;
    }

    const parent = await this.requireCategory(parentId);
    const slug = await this.resolveOthersSpecializationSlug(
      parentId,
      parent.value,
    );

    try {
      await this.masterDataRepository.create({
        type: MasterDataCategoryType.SPECIALIZATION,
        value: 'OTHERS',
        slug,
        parent: {
          connect: { id: parentId },
        },
        isActive: true,
        status: MasterStatus.ACTIVE,
        sortOrder: 9999, // Always sorts to the end of the specialization list
      });
    } catch (error) {
      // Swallow unique-constraint violations that arise when two
      // concurrent requests both pass the findByTypeValueAndParentId check
      // and race to insert OTHERS. Any other error is re-thrown.
      if (this.isUniqueConstraintViolation(error)) {
        // Another request already created OTHERS — this is fine
        return;
      }

      throw error;
    }
  }

  /**
   * Detects a Prisma unique-constraint violation (P2002), e.g. from the
   * (type, parent_id, normalized(value)) constraint, regardless of whether
   * it surfaces as a typed PrismaClientKnownRequestError or a plain error
   * with a matching message (as seen from some Prisma driver adapters).
   */
  private isUniqueConstraintViolation(error: unknown): boolean {
    const err = error as { code?: string; message?: string } | undefined;
    return (
      err?.code === 'P2002' ||
      !!err?.message?.includes('Unique constraint') ||
      !!err?.message?.includes('duplicate key')
    );
  }

  private buildOthersSlugFromParentValue(parentValue: string): string {
    const slugPart = parentValue
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `others-${slugPart}`;
  }

  private async resolveOthersSpecializationSlug(
    parentId: string,
    parentValue: string,
  ): Promise<string> {
    const baseSlug = this.buildOthersSlugFromParentValue(parentValue);
    const baseExists = await this.masterDataRepository.slugExists(
      MasterDataCategoryType.SPECIALIZATION,
      baseSlug,
    );

    if (!baseExists) {
      return baseSlug;
    }

    const suffix = parentId.split('-')[0];
    return `${baseSlug}-${suffix}`;
  }
  async getChildrenByParentId(
  parentId: string,
  childType: MasterDataCategoryType,
) {
  await this.requireCategory(parentId);

  const children =
    await this.masterDataRepository.listChildrenByParentAndType(
      parentId,
      childType,
    );

  return children.map((child) => this.toEntity(child));
}
}
