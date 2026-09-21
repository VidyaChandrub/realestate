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
import { LAYOUT_DEFAULT_GROUP_LABEL, ProjectLayoutValue } from './layouts';

type FieldSeed = Omit<FieldDef, 'key'>;

const field = (
  label: string,
  type: FieldDef['type'],
  extra: Partial<FieldDef> = {},
): FieldSeed => ({ label, type, required: false, ...extra });

// The "add common project types" starter set. Plain data: once created a
// type is just a row — nothing ever looks a type up by these names.
const COMMON_TYPES: Array<{
  name: string;
  layout: ProjectLayoutValue;
  projectFields: FieldSeed[];
  unitFields: FieldSeed[];
}> = [
  { name: 'Apartments', layout: 'tower', projectFields: [], unitFields: [] },
  {
    name: 'Villas',
    layout: 'cluster',
    projectFields: [field('Number of villas', 'number')],
    unitFields: [field('Plot area', 'number', { unit: 'sq ft' })],
  },
  {
    name: 'Plots',
    layout: 'cluster',
    projectFields: [
      field('Number of plots', 'number'),
      field('Total land', 'number', { unit: 'acres' }),
    ],
    unitFields: [field('Dimensions', 'text'), field('Corner plot', 'yesno')],
  },
  { name: 'Commercial', layout: 'tower', projectFields: [], unitFields: [] },
];

@Injectable()
export class OrgProjectTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string) {
    const rows = await this.prisma.projectTypeDef.findMany({
      where: { orgId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    // `inUse` = how many projects already use the type; the UI locks the
    // layout on those, matching the rule enforced in `update`.
    const counts = await Promise.all(
      rows.map((r) => this.countProjects(orgId, r.id, r.name)),
    );
    return rows.map((r, i) => ({ ...r, inUse: counts[i] }));
  }

  async create(orgId: string, dto: CreateProjectTypeDto) {
    try {
      const created = await this.prisma.projectTypeDef.create({
        data: { orgId, ...this.buildData(dto, dto.layout) } as Prisma.ProjectTypeDefUncheckedCreateInput,
      });
      return { ...created, inUse: 0 };
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  async update(orgId: string, id: string, dto: UpdateProjectTypeDto) {
    const existing = await this.getOwned(orgId, id);
    const inUse = await this.countProjects(orgId, existing.id, existing.name);

    if (dto.layout !== undefined && dto.layout !== existing.layout && inUse > 0) {
      throw new BadRequestException(
        `${inUse} project(s) already use this type, so its layout can't change. Create a new type with the layout you want instead.`,
      );
    }
    // Projects copy the type's name, so renaming an in-use type would orphan
    // the link the layout lock above relies on.
    if (dto.name !== undefined && dto.name.trim() !== existing.name && inUse > 0) {
      throw new BadRequestException(
        `${inUse} project(s) already use this type, so it can't be renamed.`,
      );
    }

    try {
      const updated = await this.prisma.projectTypeDef.update({
        where: { id },
        data: this.buildData(dto, dto.layout ?? existing.layout),
      });
      return { ...updated, inUse };
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  async remove(orgId: string, id: string) {
    await this.getOwned(orgId, id);
    // Safe: projects copy name, layout and templates and never reference this
    // row (same guarantee as OrgCatalogOption).
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
          ...this.buildData(
            {
              name: t.name,
              layout: t.layout,
              projectFields: t.projectFields,
              unitFields: t.unitFields,
              sortOrder: order++,
            },
            t.layout,
          ),
        } as Prisma.ProjectTypeDefUncheckedCreateInput,
      });
    }
    return { created: missing.length, types: await this.list(orgId) };
  }

  // Shared by create and update: only the fields the caller sent are
  // included, templates are validated in depth, and grouping is forced off
  // for `individual`.
  private buildData(
    dto: Partial<CreateProjectTypeDto> & { layout?: ProjectLayoutValue },
    layout: ProjectLayoutValue,
  ) {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.layout !== undefined) data.layout = dto.layout;
    if (dto.projectFields !== undefined) {
      data.projectFields = normalizeFieldTemplate(dto.projectFields);
    }
    if (dto.unitFields !== undefined) {
      data.unitFields = normalizeFieldTemplate(dto.unitFields);
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (layout === 'individual') {
      data.groupLabel = null;
    } else if (dto.groupLabel !== undefined || dto.layout !== undefined) {
      // A blank label, or one equal to the layout default, is stored as null
      // ("use the layout default").
      const label = dto.groupLabel?.trim();
      data.groupLabel =
        label && label !== LAYOUT_DEFAULT_GROUP_LABEL[layout] ? label : null;
    }
    return data;
  }

  private async getOwned(orgId: string, id: string) {
    const row = await this.prisma.projectTypeDef.findFirst({
      where: { id, orgId },
    });
    if (!row) throw new NotFoundException('Project type not found');
    return row;
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
