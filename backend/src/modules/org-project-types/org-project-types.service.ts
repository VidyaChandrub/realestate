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

// Facing and Parking are deliberately NOT template fields — Unit.facing and
// Unit.parking are already fixed, org-catalog-driven inputs on every unit
// form (Settings → Project Catalogs → Facing / Parking), the same way
// amenities already are at the project level. Re-adding them as template
// fields would just duplicate that existing, already-configurable mechanism.

// Default PROJECT-level fields — informational summary fields, same
// mechanism (and same editability) as Specifications. No special behaviour
// reads these; an org can rename, edit, reorder or delete any of them. Each
// common type gets its own set rather than one shared list, so a Plot isn't
// asked for a tower count and a Villa isn't asked for floors.
// All plain text, deliberately — the Settings editor for these has no type
// control (there's nothing to change it to, so no point showing one), and a
// number field left over from before that meant a value's input box would
// silently behave differently (spinner arrows, no free text) from every
// other project field with no visible reason why. Text keeps every one of
// these boxes identical and self-explanatory. A "Total Land Area" carries no
// fixed unit either — a project's area unit (sq ft / acre, chosen in Step 1)
// applies to `area`-role fields and price-per-area, not to arbitrary plain
// fields like this one. An org that wants a unit shown can put it in the
// label itself (e.g. "Total Land Area (acres)"), since labels are always
// editable.
const APARTMENT_PROJECT_FIELDS: FieldSeed[] = [
  field('No. of Towers / Blocks', 'text'),
  field('Floors / Structure', 'text'),
  field('Total Land Area', 'text'),
];
const PLOT_PROJECT_FIELDS: FieldSeed[] = [
  field('Total Land Area', 'text'),
  field('Plot Area Range', 'text'),
];
const VILLA_PROJECT_FIELDS: FieldSeed[] = [
  field('No. of Villas', 'text'),
  field('Total Land Area', 'text'),
  field('Villa Area Range', 'text'),
];

// The "add common project types" starter set. Plain data: once created a
// type is just a row — nothing ever looks a type up by these names. No field
// is required (the org can add that back per-field in Settings if it wants
// to); a `*`-required-by-default set was tried and the client didn't want it.
const COMMON_TYPES: Array<{ name: string; projectFields: FieldSeed[]; unitFields: FieldSeed[] }> = [
  {
    name: 'Apartment',
    projectFields: APARTMENT_PROJECT_FIELDS,
    // Lean on purpose — mirrors what the old (pre-dynamic) apartment form
    // actually asked for: tower, configuration, floor, carpet + built-up
    // area, price. An org that wants Bedrooms, Bathrooms, Super Built-up
    // Area etc. adds them from here — they're not forced on everyone.
    unitFields: [
      field('Tower / Building', 'text', { section: 'Basic Details', role: 'group' }),
      field('Apartment Type', 'choice', {
        section: 'Basic Details',
        role: 'configuration',
        options: ['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Penthouse'],
      }),
      field('Floor Number', 'number', { section: 'Basic Details', role: 'floor' }),
      field('Carpet Area', 'number', { section: 'Area & Pricing', role: 'area', unit: 'sq ft' }),
      field('Built-up Area', 'number', { section: 'Area & Pricing', unit: 'sq ft' }),
      field('Price', 'number', { section: 'Area & Pricing', role: 'price' }),
    ],
  },
  {
    name: 'Plot',
    projectFields: PLOT_PROJECT_FIELDS,
    unitFields: [
      field('Plot Type', 'choice', {
        section: 'Basic Details',
        options: ['Residential', 'Commercial', 'Industrial'],
      }),
      field('Corner Plot', 'yesno', { section: 'Basic Details' }),
      field('Gated Community', 'yesno', { section: 'Basic Details' }),
      field('Plot Area', 'number', { section: 'Location & Size', role: 'area', unit: 'sq ft' }),
      field('Length', 'number', { section: 'Location & Size', unit: 'ft' }),
      field('Width', 'number', { section: 'Location & Size', unit: 'ft' }),
      field('Road Width', 'number', { section: 'Location & Size', unit: 'ft' }),
      field('Floors Allowed', 'number', { section: 'Location & Size' }),
      field('Boundary / Location', 'text', { section: 'Location & Size' }),
      field('Water Connection', 'yesno', { section: 'Additional' }),
      field('Electricity Connection', 'yesno', { section: 'Additional' }),
      field('Approved By', 'text', { section: 'Additional' }),
      field('Property Description', 'text', { section: 'Additional', multiline: true }),
      field('Price', 'number', { section: 'Pricing', role: 'price' }),
    ],
  },
  {
    name: 'Villa',
    projectFields: VILLA_PROJECT_FIELDS,
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
      field('Built-up Area', 'number', { section: 'Area', role: 'area', unit: 'sq ft' }),
      field('Plot Area', 'number', { section: 'Area', unit: 'sq ft' }),
      field('Carpet Area', 'number', { section: 'Area', unit: 'sq ft' }),
      field('Super Built-up Area', 'number', { section: 'Area', unit: 'sq ft' }),
      field('Bedrooms', 'number', { section: 'Highlights' }),
      field('Bathrooms', 'number', { section: 'Highlights' }),
      field('Balcony', 'number', { section: 'Highlights' }),
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
    return rows.map((r, i) => {
      const common = COMMON_TYPES.find((type) => type.name.toLowerCase() === r.name.toLowerCase());
      const projectFields = common && (!Array.isArray(r.projectFields) || r.projectFields.length === 0)
        ? normalizeFieldTemplate(common.projectFields)
        : r.projectFields;
      const unitFields = common && Array.isArray(r.unitFields)
        ? r.unitFields.filter((raw) => {
            if (typeof raw !== 'object' || raw === null) return true;
            const label = typeof (raw as { label?: unknown }).label === 'string'
              ? (raw as { label: string }).label.toLowerCase()
              : '';
            return !['facing', 'parking', 'parking type', 'plot facing'].includes(label);
          })
        : r.unitFields;
      return { ...r, projectFields, unitFields, inUse: counts[i] };
    });
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
      select: { id: true, name: true, sortOrder: true, projectFields: true, unitFields: true },
    });
    const commonByName = new Map(COMMON_TYPES.map((type) => [type.name.toLowerCase(), type]));
    const have = new Set(existing.map((e) => e.name.toLowerCase()));
    let order = existing.reduce((m, e) => Math.max(m, e.sortOrder), -1) + 1;
    const missing = COMMON_TYPES.filter((t) => !have.has(t.name.toLowerCase()));
    for (const t of missing) {
      await this.prisma.projectTypeDef.create({
        data: {
          orgId,
          ...this.buildData({
            name: t.name,
            projectFields: t.projectFields,
            unitFields: t.unitFields,
            sortOrder: order++,
          }),
        } as Prisma.ProjectTypeDefUncheckedCreateInput,
      });
    }
    for (const row of existing) {
      const common = commonByName.get(row.name.toLowerCase());
      if (!common) continue;
      const projectFields = Array.isArray(row.projectFields) && row.projectFields.length > 0
        ? row.projectFields
        : normalizeFieldTemplate(common.projectFields);
      const currentUnitFields = Array.isArray(row.unitFields) ? row.unitFields : [];
      const cleanedUnitFields = currentUnitFields.filter((raw) => {
        if (typeof raw !== 'object' || raw === null) return true;
        const label = typeof (raw as { label?: unknown }).label === 'string'
          ? (raw as { label: string }).label.toLowerCase()
          : '';
        return !['facing', 'parking', 'parking type', 'plot facing'].includes(label);
      });
      if (projectFields !== row.projectFields || cleanedUnitFields.length !== currentUnitFields.length) {
        await this.prisma.projectTypeDef.update({
          where: { id: row.id },
          data: {
            projectFields: projectFields as Prisma.InputJsonValue,
            unitFields: cleanedUnitFields as Prisma.InputJsonValue,
          },
        });
      }
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

  // A field can gain a role it never had (recovery: picking an existing
  // plain field to fill a role a deleted field used to carry) and can lose
  // one it had (the field roles panel unassigning it, same end state as
  // deleting the field and re-adding it plain, just without losing the
  // field's own label/data). What's still frozen is a field flipping
  // directly from one role to a DIFFERENT one in a single edit — that would
  // silently repurpose the same field's meaning rather than moving the role
  // to a field the user actually picked for it.
  private assertRolesImmutable(
    existing: FieldDef[],
    next: FieldDef[],
    scope: string,
  ) {
    const nextByKey = new Map(next.map((field) => [field.key, field]));
    for (const field of existing) {
      if (!field.role) continue;
      const replacement = nextByKey.get(field.key);
      if (!replacement) continue;
      if (replacement.role && field.role !== replacement.role) {
        throw new BadRequestException(
          `A field can't change directly from one role to another in ${scope} fields. Unassign it first, then assign the new role.`,
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
