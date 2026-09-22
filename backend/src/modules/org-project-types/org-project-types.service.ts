import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  FieldDef,
  normalizeFieldTemplate,
} from '../../common/utils/field-template.util';
import {
  CreateProjectTypeDto,
  UpdateProjectTypeDto,
} from './dto/project-type.dto';

type FieldSeed = Omit<FieldDef, 'key'>;

const field = (
  label: string,
  type: FieldDef['type'],
  extra: Partial<FieldDef> = {},
): FieldSeed => ({ label, type, required: false, ...extra });

const FACING_OPTIONS = [
  'North', 'South', 'East', 'West',
  'North-East', 'North-West', 'South-East', 'South-West',
];

// The "add common project types" starter set. Plain data: once created a
// type is just a row — nothing ever looks a type up by these names. No field
// is required (the org can add that back per-field in Settings if it wants
// to); a `*`-required-by-default set was tried and the client didn't want it.
const COMMON_TYPES: Array<{ name: string; unitFields: FieldSeed[] }> = [
  {
    name: 'Apartment',
    unitFields: [
      field('Tower / Building', 'text', { section: 'Basic Details', role: 'group' }),
      field('Apartment Type', 'choice', {
        section: 'Basic Details',
        role: 'configuration',
        options: ['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Penthouse'],
      }),
      field('Floor Number', 'number', { section: 'Basic Details', role: 'floor' }),
      field('Total Floors', 'number', { section: 'Basic Details' }),
      field('Carpet Area', 'number', { section: 'Area & Layout', role: 'area', unit: 'sq ft' }),
      field('Built-up Area', 'number', { section: 'Area & Layout', unit: 'sq ft' }),
      field('Super Built-up Area', 'number', { section: 'Area & Layout', unit: 'sq ft' }),
      field('Bedrooms', 'number', { section: 'Area & Layout' }),
      field('Bathrooms', 'number', { section: 'Area & Layout' }),
      field('Balcony Area', 'number', { section: 'Area & Layout', unit: 'sq ft' }),
      field('Facing', 'choice', { section: 'Additional', options: FACING_OPTIONS }),
      field('Parking', 'yesno', { section: 'Additional' }),
      field('Parking Type', 'choice', { section: 'Additional', options: ['Covered', 'Open'] }),
      field('Price', 'number', { section: 'Pricing', role: 'price' }),
    ],
  },
  {
    name: 'Plot',
    unitFields: [
      field('Plot Type', 'choice', {
        section: 'Basic Details',
        options: ['Residential', 'Commercial', 'Industrial'],
      }),
      field('Plot Area', 'number', { section: 'Location & Size', role: 'area', unit: 'sq ft' }),
      field('Length', 'number', { section: 'Location & Size', unit: 'ft' }),
      field('Width', 'number', { section: 'Location & Size', unit: 'ft' }),
      field('Plot Facing', 'choice', { section: 'Location & Size', options: FACING_OPTIONS }),
      field('Road Width', 'number', { section: 'Location & Size', unit: 'ft' }),
      field('Floors Allowed', 'number', { section: 'Location & Size' }),
      field('Boundary / Location', 'text', { section: 'Location & Size' }),
      field('Price', 'number', { section: 'Pricing', role: 'price' }),
    ],
  },
  {
    name: 'Villa',
    unitFields: [
      field('Villa Type', 'choice', {
        section: 'Basic Details',
        options: ['Independent', 'Row', 'Twin', 'Luxury'],
      }),
      // Price per unit area uses Built-up Area for villas (see Area section)
      // rather than Carpet Area — the conventional quoting basis for
      // independent/villa listings, where carpet area is often undefined.
      field('Configuration', 'choice', {
        section: 'Basic Details',
        role: 'configuration',
        options: ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK+'],
      }),
      field('Total Floors', 'number', { section: 'Basic Details' }),
      field('Construction Status', 'choice', {
        section: 'Basic Details',
        options: ['Under Construction', 'Ready to Move'],
      }),
      field('Furnishing Status', 'choice', {
        section: 'Basic Details',
        options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
      }),
      field('Facing', 'choice', { section: 'Basic Details', options: FACING_OPTIONS }),
      field('Built-up Area', 'number', { section: 'Area', role: 'area', unit: 'sq ft' }),
      field('Plot Area', 'number', { section: 'Area', unit: 'sq ft' }),
      field('Carpet Area', 'number', { section: 'Area', unit: 'sq ft' }),
      field('Super Built-up Area', 'number', { section: 'Area', unit: 'sq ft' }),
      field('Bedrooms', 'number', { section: 'Highlights' }),
      field('Bathrooms', 'number', { section: 'Highlights' }),
      field('Balcony', 'number', { section: 'Highlights' }),
      field('Parking', 'choice', { section: 'Highlights', options: ['None', 'Covered', 'Open'] }),
      field('Private Garden', 'yesno', { section: 'Highlights' }),
      field('Servant Room', 'yesno', { section: 'Highlights' }),
      field('Swimming Pool', 'yesno', { section: 'Highlights' }),
      field('View Type', 'choice', {
        section: 'Highlights',
        options: ['Garden', 'Pool', 'City', 'Street', 'Other'],
      }),
      field('Property Description', 'text', { section: 'Additional', multiline: true }),
      field('Price', 'number', { section: 'Pricing', role: 'price' }),
      // No group-role field by default — an independent villa community has
      // no towers/blocks, so it renders as a flat list. An org whose villas
      // sit in blocks can add one from Settings.
    ],
  },
];

@Injectable()
export class OrgProjectTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string) {
    const rows = await this.prisma.projectTypeDef.findMany({
      where: { orgId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    // `inUse` = how many projects already use the type — surfaced so the UI
    // can warn before an edit that would affect live projects.
    const counts = await Promise.all(
      rows.map((r) => this.countProjects(orgId, r.id, r.name)),
    );
    return rows.map((r, i) => ({ ...r, inUse: counts[i] }));
  }

  async create(orgId: string, dto: CreateProjectTypeDto) {
    try {
      const created = await this.prisma.projectTypeDef.create({
        data: { orgId, ...this.buildData(dto) } as Prisma.ProjectTypeDefUncheckedCreateInput,
      });
      return { ...created, inUse: 0 };
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  async update(orgId: string, id: string, dto: UpdateProjectTypeDto) {
    const existing = await this.getOwned(orgId, id);
    const inUse = await this.countProjects(orgId, existing.id, existing.name);

    if (dto.projectFields !== undefined) {
      this.assertRolesImmutable(
        normalizeFieldTemplate(existing.projectFields),
        normalizeFieldTemplate(dto.projectFields),
        'project',
      );
    }
    if (dto.unitFields !== undefined) {
      this.assertRolesImmutable(
        normalizeFieldTemplate(existing.unitFields),
        normalizeFieldTemplate(dto.unitFields),
        'unit',
      );
    }

    // Projects copy the type's name, so renaming an in-use type would orphan
    // the link `countProjects`'s name-fallback relies on.
    if (dto.name !== undefined && dto.name.trim() !== existing.name && inUse > 0) {
      throw new BadRequestException(
        `${inUse} project(s) already use this type, so it can't be renamed.`,
      );
    }

    try {
      const updated = await this.prisma.projectTypeDef.update({
        where: { id },
        data: this.buildData(dto),
      });
      return { ...updated, inUse };
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  async remove(orgId: string, id: string) {
    await this.getOwned(orgId, id);
    // Safe: projects copy name and templates and never reference this row
    // (same guarantee as OrgCatalogOption).
    await this.prisma.projectTypeDef.delete({ where: { id } });
    return { success: true };
  }

  // Creates whichever common types the org doesn't have yet (matched by name,
  // case-insensitively). Idempotent.
  async addCommon(orgId: string) {
    const existing = await this.prisma.projectTypeDef.findMany({
      where: { orgId },
      select: { name: true, sortOrder: true },
    });
    const have = new Set(existing.map((e) => e.name.toLowerCase()));
    let order = existing.reduce((m, e) => Math.max(m, e.sortOrder), -1) + 1;
    const missing = COMMON_TYPES.filter((t) => !have.has(t.name.toLowerCase()));
    for (const t of missing) {
      await this.prisma.projectTypeDef.create({
        data: {
          orgId,
          ...this.buildData({
            name: t.name,
            projectFields: [],
            unitFields: t.unitFields,
            sortOrder: order++,
          }),
        } as Prisma.ProjectTypeDefUncheckedCreateInput,
      });
    }
    return { created: missing.length, types: await this.list(orgId) };
  }

  // Shared by create and update: only the fields the caller sent are
  // included; templates are validated in depth (type, role, choice options,
  // unique keys/labels/roles).
  private buildData(dto: Partial<CreateProjectTypeDto>) {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.projectFields !== undefined) {
      data.projectFields = normalizeFieldTemplate(dto.projectFields);
    }
    if (dto.unitFields !== undefined) {
      data.unitFields = normalizeFieldTemplate(dto.unitFields);
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    return data;
  }

  private async getOwned(orgId: string, id: string) {
    const row = await this.prisma.projectTypeDef.findFirst({
      where: { id, orgId },
    });
    if (!row) throw new NotFoundException('Project type not found');
    return row;
  }

  private assertRolesImmutable(
    existing: FieldDef[],
    next: FieldDef[],
    scope: string,
  ) {
    const nextByKey = new Map(next.map((field) => [field.key, field]));
    for (const field of existing) {
      const replacement = nextByKey.get(field.key);
      if (!replacement) continue;
      if ((field.role ?? null) !== (replacement.role ?? null)) {
        throw new BadRequestException(
          `The role of an existing ${scope} field cannot be changed. Delete the field and add a new one instead.`,
        );
      }
    }
  }

  // Projects made from a type point at it by id; the name match also catches
  // any older project that only carries the copied name.
  private countProjects(orgId: string, id: string, name: string) {
    return this.prisma.project.count({
      where: { orgId, OR: [{ projectTypeId: id }, { projectType: name }] },
    });
  }

  private mapDuplicate(err: unknown): unknown {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return new BadRequestException(
        'A project type with that name already exists',
      );
    }
    return err;
  }
}
