import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, UnitPriceBasis } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { CreateUnitTypeDto } from './dto/create-unit-type.dto';
import { UpdateUnitTypeDto } from './dto/update-unit-type.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto, UpdateUnitStatusDto } from './dto/update-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units-query.dto';
import { ListOrgUnitsQueryDto } from './dto/list-org-units-query.dto';

// Columns a PATCH may set on a Project, and the coercion each needs. Keeps
// update() free of a 12-branch if-ladder while still only touching the keys
// the caller actually sent (an omitted key is left untouched; an explicit
// null clears a nullable column).
const PROJECT_SCALARS = [
  'name',
  'location',
  'reraId',
  'possession',
  'managerId',
  'status',
  'priceMin',
  'priceMax',
  'baseRate',
  'towerCount',
  'floorsDescription',
  'carpetRange',
  // Wizard Steps 1-2 identity & timeline.
  'projectType',
  'tagline',
  'launchDate',
  'constructionStage',
  'highlights',
  'salesTeam',
  // Onboarding-wizard scalars (Steps 3-8). Arrays (priceIncludes,
  // connectivity, galleryUrls) and Json (specifications, marketing) are
  // handled separately below.
  'bookingAmount',
  'currency',
  'paymentPlan',
  'offers',
  'addressLine',
  'city',
  'locality',
  'pincode',
  'latitude',
  'longitude',
  'landmarks',
  'requireBookingApproval',
  'visibleToTelecallers',
  'publishedToWebsite',
  'coverImageUrl',
  'brochureUrl',
  'reraCertificateUrl',
] as const;

// Authorship is expanded on every unit response so the units list can show
// "Updated by X" without a second request or an audit_logs lookup.
const UNIT_ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} as const;

const UNIT_INCLUDE = {
  createdBy: UNIT_ACTOR_SELECT,
  updatedBy: UNIT_ACTOR_SELECT,
} satisfies Prisma.UnitInclude;

type UnitRow = Prisma.UnitGetPayload<{ include: typeof UNIT_INCLUDE }>;

// The manager relation is expanded on every project response so the client
// never needs a second round-trip just to show a name — same approach as
// OrgLandingPages including `sourceTemplate: { select: { id, name } }`.
const PROJECT_INCLUDE = {
  manager: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof PROJECT_INCLUDE }>;

type UnitTypeWithCounts = Prisma.UnitTypeGetPayload<Record<string, never>> & {
  unitCount: number;
  availableUnits: number;
  bookedUnits: number;
  heldUnits: number;
  soldUnits: number;
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // -------------------------------------------------------------------------
  // Media uploads — issue a short-lived presigned PUT URL for direct
  // browser → R2 upload. Bytes never pass through this API. The key's
  // orgId segment is always the caller's own (from the JWT); if a
  // projectId / unitTypeId is given we verify the caller owns it before
  // signing, so a URL can only ever be scoped into your own key space.
  // -------------------------------------------------------------------------
  async createUploadUrl(orgId: string, dto: CreateUploadUrlDto) {
    if (dto.unitTypeId) {
      if (!dto.projectId) {
        throw new BadRequestException(
          'projectId is required when unitTypeId is given.',
        );
      }
      await this.getOwnedUnitType(orgId, dto.projectId, dto.unitTypeId);
    } else if (dto.projectId) {
      await this.getOwnedProject(orgId, dto.projectId);
    }

    return this.storage.createUploadUrl({
      orgId,
      field: dto.field,
      filename: dto.filename,
      contentType: dto.contentType,
      size: dto.size,
      projectId: dto.projectId,
      unitTypeId: dto.unitTypeId,
    });
  }

  // -------------------------------------------------------------------------
  // Projects
  // -------------------------------------------------------------------------

  async create(orgId: string, dto: CreateProjectDto) {
    if (dto.managerId) await this.assertOrgUser(orgId, dto.managerId);

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          orgId,
          name: dto.name,
          location: dto.location ?? null,
          reraId: dto.reraId ?? null,
          possession: dto.possession ?? null,
          managerId: dto.managerId ?? null,
          status: dto.status ?? 'active',
          priceMin: dto.priceMin ?? null,
          priceMax: dto.priceMax ?? null,
          baseRate: dto.baseRate ?? null,
          landArea: dto.landArea ?? null,
          towerCount: dto.towerCount ?? null,
          floorsDescription: dto.floorsDescription ?? null,
          carpetRange: dto.carpetRange ?? null,
          projectType: dto.projectType ?? null,
          tagline: dto.tagline ?? null,
          launchDate: dto.launchDate ?? null,
          constructionStage: dto.constructionStage ?? null,
          highlights: dto.highlights ?? null,
          salesTeam: dto.salesTeam ?? null,
          amenities: (dto.amenities ?? []) as unknown as Prisma.InputJsonValue,
          // Onboarding-wizard fields (Steps 3-8).
          bookingAmount: dto.bookingAmount ?? null,
          currency: dto.currency ?? 'INR',
          priceIncludes: dto.priceIncludes ?? [],
          paymentPlan: dto.paymentPlan ?? null,
          offers: dto.offers ?? null,
          addressLine: dto.addressLine ?? null,
          city: dto.city ?? null,
          locality: dto.locality ?? null,
          pincode: dto.pincode ?? null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          connectivity: dto.connectivity ?? [],
          landmarks: dto.landmarks ?? null,
          specifications: dto.specifications as unknown as
            Prisma.InputJsonValue | undefined,
          marketing: dto.marketing as unknown as
            Prisma.InputJsonValue | undefined,
          requireBookingApproval: dto.requireBookingApproval ?? false,
          visibleToTelecallers: dto.visibleToTelecallers ?? true,
          publishedToWebsite: dto.publishedToWebsite ?? false,
          coverImageUrl: dto.coverImageUrl ?? null,
          galleryUrls: dto.galleryUrls ?? [],
          brochureUrl: dto.brochureUrl ?? null,
          reraCertificateUrl: dto.reraCertificateUrl ?? null,
          floorPlanUrls: dto.floorPlanUrls ?? [],
        },
      });

      await tx.auditLog.create({
        data: {
          orgId,
          action: 'project_created',
          entity: 'Project',
          entityId: created.id,
          metadata: { name: created.name },
        },
      });

      return created;
    });

    return this.getById(orgId, project.id);
  }

  async list(orgId: string, query: ListProjectsQueryDto, actor?: JwtPayload) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const andConditions: Prisma.ProjectWhereInput[] = [{ orgId }];
    if (query.status) andConditions.push({ status: query.status });
    if (query.search) {
      andConditions.push({ name: { contains: query.search, mode: 'insensitive' } });
    }

    if (actor && !actor.roles?.includes('admin') && !actor.roles?.includes('super_admin')) {
      andConditions.push({
        OR: [
          { managerId: actor.sub },
          { salesAgents: { some: { userId: actor.sub } } },
        ],
      });
    }

    const where: Prisma.ProjectWhereInput = andConditions.length > 1 ? { AND: andConditions } : andConditions[0]!;

    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          ...PROJECT_INCLUDE,
          _count: { select: { unitTypes: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    const data = rows.map((row) => ({
      ...this.serializeProject(row),
      unitTypeCount: row._count.unitTypes,
    }));

    return { data, total, page, limit };
  }

  async getById(orgId: string, id: string, actor?: JwtPayload) {
    const project = await this.getOwnedProject(orgId, id, actor);

    const unitTypes = await this.prisma.unitType.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' },
    });
    const decorated = await this.decorateUnitTypes(unitTypes);

    const salesAgentRows = await this.prisma.projectSalesAgent.findMany({
      where: { projectId: id },
      select: { userId: true },
    });

    // Actual counts come straight from the project's Unit rows (grouped by
    // status), so a unit whose configuration matches no planned UnitType is
    // still counted. Planned total still comes from the UnitType rows.
    const statusGrouped = await this.prisma.unit.groupBy({
      by: ['status'],
      where: { projectId: id },
      _count: { _all: true },
    });
    const actual = { available: 0, booked: 0, held: 0, sold: 0, total: 0 };
    for (const g of statusGrouped) {
      actual[g.status] = g._count._all;
      actual.total += g._count._all;
    }

    const rollup = {
      totalUnitsPlanned: decorated.reduce((s, ut) => s + ut.totalUnits, 0),
      unitsCreated: actual.total,
      unitsAvailable: actual.available,
      unitsBooked: actual.booked,
      unitsHeld: actual.held,
      unitsSold: actual.sold,
    };

    // Every distinct configuration actually present on the project's units
    // (a superset of the planned UnitType names) with its status breakdown —
    // the [id]/units page renders one card per configuration.
    const configGrouped = await this.prisma.unit.groupBy({
      by: ['configuration', 'status'],
      where: { projectId: id, configuration: { not: null } },
      _count: { _all: true },
    });
    const configMap = new Map<
      string,
      {
        label: string;
        total: number;
        available: number;
        booked: number;
        held: number;
        sold: number;
      }
    >();
    for (const g of configGrouped) {
      const label = g.configuration!;
      const e =
        configMap.get(label) ??
        { label, total: 0, available: 0, booked: 0, held: 0, sold: 0 };
      const n = g._count._all;
      e.total += n;
      e[g.status] += n;
      configMap.set(label, e);
    }

    return {
      ...this.serializeProject(project),
      unitTypes: decorated.map((ut) => this.serializeUnitType(ut)),
      configurations: [...configMap.values()].sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
      rollup,
      salesAgentIds: salesAgentRows.map((r) => r.userId),
    };
  }

  async update(orgId: string, id: string, dto: UpdateProjectDto, actor?: JwtPayload) {
    await this.getOwnedProject(orgId, id, actor);
    if (dto.managerId) await this.assertOrgUser(orgId, dto.managerId);

    const data: Prisma.ProjectUncheckedUpdateInput = {};
    for (const key of PROJECT_SCALARS) {
      if (dto[key] !== undefined) {
        (data as Record<string, unknown>)[key] = dto[key];
      }
    }
    if (dto.landArea !== undefined) data.landArea = dto.landArea;
    if (dto.amenities !== undefined) {
      data.amenities = dto.amenities as unknown as Prisma.InputJsonValue;
    }
    // Onboarding-wizard arrays + preference blobs.
    if (dto.priceIncludes !== undefined) data.priceIncludes = dto.priceIncludes;
    if (dto.connectivity !== undefined) data.connectivity = dto.connectivity;
    if (dto.galleryUrls !== undefined) data.galleryUrls = dto.galleryUrls;
    if (dto.floorPlanUrls !== undefined) data.floorPlanUrls = dto.floorPlanUrls;
    if (dto.specifications !== undefined) {
      data.specifications =
        dto.specifications as unknown as Prisma.InputJsonValue;
    }
    if (dto.marketing !== undefined) {
      data.marketing = dto.marketing as unknown as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.project.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'project_updated',
          entity: 'Project',
          entityId: id,
          metadata: { fields: Object.keys(data) },
        },
      });
      return row;
    });

    void updated;
    return this.getById(orgId, id);
  }

  async remove(orgId: string, id: string, actor?: JwtPayload) {
    await this.getOwnedProject(orgId, id, actor);
    // Hard delete — no soft-delete anywhere in this codebase. Child
    // unit_types and units cascade via the FK ON DELETE CASCADE.
    await this.prisma.$transaction(async (tx) => {
      await tx.project.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'project_deleted',
          entity: 'Project',
          entityId: id,
          metadata: {},
        },
      });
    });
    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Sales agents assigned to a project (Step 7 of the onboarding wizard).
  // A plain many-to-many with User; PUT replaces the whole set so
  // re-submitting is idempotent (delete-all + recreate in one transaction).
  // -------------------------------------------------------------------------

  async listSalesAgents(orgId: string, projectId: string) {
    await this.getOwnedProject(orgId, projectId);
    const rows = await this.prisma.projectSalesAgent.findMany({
      where: { projectId },
      orderBy: { assignedAt: 'asc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return rows.map((r) => ({
      id: r.user.id,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      email: r.user.email,
      name:
        [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') ||
        r.user.email,
      assignedAt: r.assignedAt,
    }));
  }

  async setSalesAgents(orgId: string, projectId: string, userIds: string[]) {
    await this.getOwnedProject(orgId, projectId);

    const unique = [...new Set(userIds)];
    if (unique.length > 0) {
      // Every id must be a Sales-role user in the caller's own org — never
      // trusted from the body. The picker only shows sales users, but a
      // direct API call must not be able to attach an admin/manager. Role
      // check uses the same `userRoles.some.role.key` shape as
      // org-users.util.ts / admin-organisations.service.ts.
      const count = await this.prisma.user.count({
        where: {
          id: { in: unique },
          orgId,
          userRoles: { some: { role: { key: 'sales' } } },
        },
      });
      if (count !== unique.length) {
        throw new BadRequestException(
          'Every assigned agent must be a Sales-role user in your organisation',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectSalesAgent.deleteMany({ where: { projectId } });
      if (unique.length > 0) {
        await tx.projectSalesAgent.createMany({
          data: unique.map((userId) => ({ projectId, userId })),
        });
      }
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'project_sales_agents_set',
          entity: 'Project',
          entityId: projectId,
          metadata: { count: unique.length },
        },
      });
    });

    return this.listSalesAgents(orgId, projectId);
  }

  // -------------------------------------------------------------------------
  // Unit types
  // -------------------------------------------------------------------------

  async createUnitType(
    orgId: string,
    projectId: string,
    dto: CreateUnitTypeDto,
  ) {
    await this.getOwnedProject(orgId, projectId);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.unitType.create({
        data: {
          projectId,
          name: dto.name,
          carpetSqft: dto.carpetSqft ?? null,
          builtupSqft: dto.builtupSqft ?? null,
          price: dto.price ?? null,
          totalUnits: dto.totalUnits ?? 0,
          floorPlanUrl: dto.floorPlanUrl ?? null,
          brochureUrl: dto.brochureUrl ?? null,
          videoUrl: dto.videoUrl ?? null,
          galleryUrls: dto.galleryUrls ?? [],
        },
      });
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'unit_type_created',
          entity: 'UnitType',
          entityId: row.id,
          metadata: { projectId, name: row.name },
        },
      });
      return row;
    });

    const [decorated] = await this.decorateUnitTypes([created]);
    return this.serializeUnitType(decorated);
  }

  async listUnitTypes(orgId: string, projectId: string) {
    await this.getOwnedProject(orgId, projectId);
    const rows = await this.prisma.unitType.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    const decorated = await this.decorateUnitTypes(rows);
    return decorated.map((ut) => this.serializeUnitType(ut));
  }

  async getUnitType(orgId: string, projectId: string, id: string) {
    const row = await this.getOwnedUnitType(orgId, projectId, id);
    const [decorated] = await this.decorateUnitTypes([row]);
    return this.serializeUnitType(decorated);
  }

  async updateUnitType(
    orgId: string,
    projectId: string,
    id: string,
    dto: UpdateUnitTypeDto,
  ) {
    await this.getOwnedUnitType(orgId, projectId, id);

    const data: Prisma.UnitTypeUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.carpetSqft !== undefined) data.carpetSqft = dto.carpetSqft;
    if (dto.builtupSqft !== undefined) data.builtupSqft = dto.builtupSqft;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.totalUnits !== undefined) data.totalUnits = dto.totalUnits;
    if (dto.floorPlanUrl !== undefined) data.floorPlanUrl = dto.floorPlanUrl;
    if (dto.brochureUrl !== undefined) data.brochureUrl = dto.brochureUrl;
    if (dto.videoUrl !== undefined) data.videoUrl = dto.videoUrl;
    if (dto.galleryUrls !== undefined) data.galleryUrls = dto.galleryUrls;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.unitType.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'unit_type_updated',
          entity: 'UnitType',
          entityId: id,
          metadata: { projectId, fields: Object.keys(data) },
        },
      });
      return row;
    });

    const [decorated] = await this.decorateUnitTypes([updated]);
    return this.serializeUnitType(decorated);
  }

  async removeUnitType(orgId: string, projectId: string, id: string) {
    await this.getOwnedUnitType(orgId, projectId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.unitType.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'unit_type_deleted',
          entity: 'UnitType',
          entityId: id,
          metadata: { projectId },
        },
      });
    });
    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Units
  // -------------------------------------------------------------------------

  async createUnit(
    orgId: string,
    projectId: string,
    dto: CreateUnitDto,
    actorId?: string,
  ) {
    const project = await this.getOwnedProject(orgId, projectId);

    // In a project, the configuration must be one the project itself has —
    // not just anything in the org catalog. Never trusted from the body.
    await this.assertConfigurationForProject(projectId, dto.configuration);
    await this.assertVariantInCatalog(orgId, dto.variantLabel);

    const tower = dto.tower?.trim() || null;
    await this.assertTowerWithinLimit(projectId, project.towerCount, tower);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.unit.create({
        data: {
          orgId,
          projectId,
          configuration: dto.configuration.trim(),
          variantLabel: dto.variantLabel?.trim() || null,
          unitNo: dto.unitNo,
          carpetSqft: dto.carpetSqft ?? null,
          builtupSqft: dto.builtupSqft ?? null,
          tower,
          floor: dto.floor ?? null,
          facing: dto.facing ?? null,
          parking: dto.parking?.trim() || null,
          price: dto.price ?? null,
          addressLine: dto.addressLine?.trim() || null,
          ownerName: dto.ownerName?.trim() || null,
          notes: dto.notes?.trim() || null,
          floorPlanUrl: dto.floorPlanUrl ?? null,
          galleryUrls: dto.galleryUrls ?? [],
          status: dto.status ?? 'available',
          createdById: actorId ?? null,
          updatedById: actorId ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          orgId,
          actorId: actorId ?? null,
          action: 'unit_created',
          entity: 'Unit',
          entityId: row.id,
          metadata: {
            projectId,
            configuration: row.configuration,
            unitNo: row.unitNo,
          },
        },
      });
      return row;
    });

    return this.getUnit(orgId, projectId, created.id);
  }

  async listUnits(orgId: string, projectId: string, query: ListUnitsQueryDto) {
    await this.getOwnedProject(orgId, projectId);

    const where: Prisma.UnitWhereInput = { projectId };
    if (query.configuration) where.configuration = query.configuration;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.unitNo = { contains: query.search, mode: 'insensitive' };
    }

    const [rows, basis] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        orderBy: [{ unitNo: 'asc' }],
        include: UNIT_INCLUDE,
      }),
      this.orgPriceBasis(orgId),
    ]);

    return rows.map((row) => this.serializeUnit(row, basis));
  }

  async getUnit(orgId: string, projectId: string, id: string) {
    const [row, basis] = await Promise.all([
      this.getOwnedUnit(orgId, projectId, id),
      this.orgPriceBasis(orgId),
    ]);
    return this.serializeUnit(row, basis);
  }

  async updateUnit(
    orgId: string,
    projectId: string,
    id: string,
    dto: UpdateUnitDto,
    actorId?: string,
  ) {
    const project = await this.getOwnedProject(orgId, projectId);
    const existing = await this.getOwnedUnit(orgId, projectId, id);

    if (dto.configuration !== undefined) {
      // The unit's own current value stays valid, so an edit never has to
      // rename a unit whose configuration has since been dropped.
      await this.assertConfigurationForProject(
        projectId,
        dto.configuration,
        existing.configuration,
      );
    }
    if (dto.variantLabel !== undefined) {
      await this.assertVariantInCatalog(
        orgId,
        dto.variantLabel,
        existing.variantLabel,
      );
    }
    if (dto.tower !== undefined && typeof dto.tower === 'string') {
      const nextTower = dto.tower.trim() || null;
      await this.assertTowerWithinLimit(
        projectId,
        project.towerCount,
        nextTower,
        id,
      );
    }

    const data: Prisma.UnitUncheckedUpdateInput = {};
    if (dto.configuration !== undefined) {
      data.configuration = dto.configuration.trim();
    }
    if (dto.variantLabel !== undefined) {
      data.variantLabel =
        typeof dto.variantLabel === 'string'
          ? dto.variantLabel.trim() || null
          : null;
    }
    if (dto.carpetSqft !== undefined) data.carpetSqft = dto.carpetSqft;
    if (dto.builtupSqft !== undefined) data.builtupSqft = dto.builtupSqft;
    if (dto.unitNo !== undefined) data.unitNo = dto.unitNo;
    if (dto.tower !== undefined) {
      data.tower =
        typeof dto.tower === 'string' ? dto.tower.trim() || null : null;
    }
    if (dto.floor !== undefined) data.floor = dto.floor;
    if (dto.facing !== undefined) data.facing = dto.facing;
    if (dto.parking !== undefined) {
      data.parking =
        typeof dto.parking === 'string' ? dto.parking.trim() || null : null;
    }
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.addressLine !== undefined) {
      data.addressLine =
        typeof dto.addressLine === 'string'
          ? dto.addressLine.trim() || null
          : null;
    }
    if (dto.ownerName !== undefined) {
      data.ownerName =
        typeof dto.ownerName === 'string' ? dto.ownerName.trim() || null : null;
    }
    if (dto.notes !== undefined) {
      data.notes =
        typeof dto.notes === 'string' ? dto.notes.trim() || null : null;
    }
    if (dto.floorPlanUrl !== undefined) data.floorPlanUrl = dto.floorPlanUrl;
    if (dto.galleryUrls !== undefined) data.galleryUrls = dto.galleryUrls;

    data.updatedById = actorId ?? null;

    await this.prisma.$transaction(async (tx) => {
      await tx.unit.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          orgId,
          actorId: actorId ?? null,
          action: 'unit_updated',
          entity: 'Unit',
          entityId: id,
          metadata: { projectId, fields: Object.keys(data) },
        },
      });
    });

    return this.getUnit(orgId, projectId, id);
  }

  async updateUnitStatus(
    orgId: string,
    projectId: string,
    id: string,
    dto: UpdateUnitStatusDto,
    actorId?: string,
  ) {
    const current = await this.getOwnedUnit(orgId, projectId, id);
    if (current.status === dto.status) {
      return this.serializeUnit(current, await this.orgPriceBasis(orgId));
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.unit.update({
        where: { id },
        // A status change is an edit — it counts towards "updated by".
        data: { status: dto.status, updatedById: actorId ?? null },
      });
      await tx.auditLog.create({
        data: {
          orgId,
          actorId: actorId ?? null,
          action: 'unit_status_changed',
          entity: 'Unit',
          entityId: id,
          metadata: { projectId, from: current.status, to: dto.status },
        },
      });
    });

    return this.getUnit(orgId, projectId, id);
  }

  async removeUnit(orgId: string, projectId: string, id: string) {
    await this.getOwnedUnit(orgId, projectId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.unit.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'unit_deleted',
          entity: 'Unit',
          entityId: id,
          metadata: { projectId },
        },
      });
    });
    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Standalone units — resale / broker listings with no project. Same table,
  // same catalog-validated `configuration`, `projectId` is null. No tower /
  // floor (there's no project to bound the tower count against). Reached via
  // the non-nested /org/units routes.
  // -------------------------------------------------------------------------

  async createStandaloneUnit(
    orgId: string,
    dto: CreateUnitDto,
    actorId?: string,
  ) {
    // Standalone units belong to no project, so the org catalog is the scope.
    await this.assertConfigurationInCatalog(orgId, dto.configuration);
    await this.assertVariantInCatalog(orgId, dto.variantLabel);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.unit.create({
        data: {
          orgId,
          projectId: null,
          configuration: dto.configuration.trim(),
          variantLabel: dto.variantLabel?.trim() || null,
          unitNo: dto.unitNo,
          carpetSqft: dto.carpetSqft ?? null,
          builtupSqft: dto.builtupSqft ?? null,
          tower: null,
          floor: null,
          facing: dto.facing ?? null,
          parking: dto.parking?.trim() || null,
          price: dto.price ?? null,
          addressLine: dto.addressLine?.trim() || null,
          ownerName: dto.ownerName?.trim() || null,
          notes: dto.notes?.trim() || null,
          floorPlanUrl: dto.floorPlanUrl ?? null,
          galleryUrls: dto.galleryUrls ?? [],
          status: dto.status ?? 'available',
          createdById: actorId ?? null,
          updatedById: actorId ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          orgId,
          actorId: actorId ?? null,
          action: 'standalone_unit_created',
          entity: 'Unit',
          entityId: row.id,
          metadata: { configuration: row.configuration, unitNo: row.unitNo },
        },
      });
      return row;
    });

    return this.getStandaloneUnit(orgId, created.id);
  }

  async getStandaloneUnit(orgId: string, id: string) {
    const [row, basis] = await Promise.all([
      this.getOwnedStandaloneUnit(orgId, id),
      this.orgPriceBasis(orgId),
    ]);
    return this.serializeUnit(row, basis);
  }

  async updateStandaloneUnit(
    orgId: string,
    id: string,
    dto: UpdateUnitDto,
    actorId?: string,
  ) {
    const existing = await this.getOwnedStandaloneUnit(orgId, id);

    if (dto.configuration !== undefined) {
      await this.assertConfigurationInCatalog(orgId, dto.configuration);
    }
    if (dto.variantLabel !== undefined) {
      await this.assertVariantInCatalog(
        orgId,
        dto.variantLabel,
        existing.variantLabel,
      );
    }

    const data: Prisma.UnitUncheckedUpdateInput = {};
    if (dto.configuration !== undefined) {
      data.configuration = dto.configuration.trim();
    }
    if (dto.variantLabel !== undefined) {
      data.variantLabel =
        typeof dto.variantLabel === 'string'
          ? dto.variantLabel.trim() || null
          : null;
    }
    if (dto.carpetSqft !== undefined) data.carpetSqft = dto.carpetSqft;
    if (dto.builtupSqft !== undefined) data.builtupSqft = dto.builtupSqft;
    if (dto.unitNo !== undefined) data.unitNo = dto.unitNo;
    if (dto.facing !== undefined) data.facing = dto.facing;
    if (dto.parking !== undefined) {
      data.parking =
        typeof dto.parking === 'string' ? dto.parking.trim() || null : null;
    }
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.addressLine !== undefined) {
      data.addressLine =
        typeof dto.addressLine === 'string'
          ? dto.addressLine.trim() || null
          : null;
    }
    if (dto.ownerName !== undefined) {
      data.ownerName =
        typeof dto.ownerName === 'string' ? dto.ownerName.trim() || null : null;
    }
    if (dto.notes !== undefined) {
      data.notes =
        typeof dto.notes === 'string' ? dto.notes.trim() || null : null;
    }
    if (dto.floorPlanUrl !== undefined) data.floorPlanUrl = dto.floorPlanUrl;
    if (dto.galleryUrls !== undefined) data.galleryUrls = dto.galleryUrls;
    data.updatedById = actorId ?? null;

    await this.prisma.$transaction(async (tx) => {
      await tx.unit.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          orgId,
          actorId: actorId ?? null,
          action: 'standalone_unit_updated',
          entity: 'Unit',
          entityId: id,
          metadata: { fields: Object.keys(data) },
        },
      });
    });

    return this.getStandaloneUnit(orgId, id);
  }

  async removeStandaloneUnit(orgId: string, id: string) {
    await this.getOwnedStandaloneUnit(orgId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.unit.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'standalone_unit_deleted',
          entity: 'Unit',
          entityId: id,
          metadata: {},
        },
      });
    });
    return { success: true };
  }

  private async getOwnedStandaloneUnit(orgId: string, id: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, orgId, projectId: null },
      include: UNIT_INCLUDE,
    });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  // -------------------------------------------------------------------------
  // Cross-project unit list — the "All Units" screen. Org-scoped directly by
  // Unit.orgId (project-bound and standalone units alike). Paginated
  // { data, total, page, limit } like ListProjects; `counts` is the status
  // breakdown for the same filter set (minus pagination) so the summary
  // tiles don't need a second request.
  // -------------------------------------------------------------------------

  async listAllUnits(orgId: string, query: ListOrgUnitsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.UnitWhereInput = { orgId };
    if (query.projectId) where.projectId = query.projectId;
    else if (query.standalone) where.projectId = null;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.unitNo = { contains: query.search, mode: 'insensitive' };
    }

    const [rows, total, grouped, basis] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          ...UNIT_INCLUDE,
          project: { select: { id: true, name: true, currency: true } },
        },
      }),
      this.prisma.unit.count({ where }),
      this.prisma.unit.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.orgPriceBasis(orgId),
    ]);

    const counts = { available: 0, booked: 0, held: 0, sold: 0 };
    for (const g of grouped) {
      counts[g.status] = g._count._all;
    }

    const data = rows.map((u) => ({
      id: u.id,
      unitNo: u.unitNo,
      configuration: u.configuration,
      variantLabel: u.variantLabel,
      carpetSqft: u.carpetSqft,
      builtupSqft: u.builtupSqft,
      tower: u.tower,
      floor: u.floor,
      facing: u.facing,
      parking: u.parking,
      price: u.price,
      pricePerSqft: this.pricePerSqft(u, basis),
      pricePerSqftBasis: basis,
      status: u.status,
      createdById: u.createdById,
      updatedById: u.updatedById,
      createdBy: this.serializeActor(u.createdBy),
      updatedBy: this.serializeActor(u.updatedBy),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      project: u.project
        ? { id: u.project.id, name: u.project.name, currency: u.project.currency }
        : null,
    }));

    return { data, total, page, limit, counts };
  }

  // -------------------------------------------------------------------------
  // Ownership helpers — every path re-derives scope from orgId (the JWT),
  // never from a client-supplied id. A foreign org's row 404s exactly the
  // same as a non-existent id, so existence never leaks across tenants.
  // -------------------------------------------------------------------------

  private async getOwnedProject(orgId: string, id: string, actor?: JwtPayload) {
    const project = await this.prisma.project.findFirst({
      where: { id, orgId },
      include: PROJECT_INCLUDE,
    });
    if (!project) throw new NotFoundException('Project not found');

    if (actor && !actor.roles?.includes('admin') && !actor.roles?.includes('super_admin')) {
      const isManager = project.managerId === actor.sub;
      const isSales = await this.prisma.projectSalesAgent.findFirst({
        where: { projectId: id, userId: actor.sub },
        select: { userId: true },
      });
      if (!isManager && !isSales) {
        throw new ForbiddenException('You do not have access to this project');
      }
    }

    return project;
  }

  // A project's manager must be a user in the same org — verified here,
  // never trusted from the body.
  private async assertOrgUser(orgId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, orgId },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException(
        'Manager must be a user in your organisation',
      );
    }
  }

  private async getOwnedUnitType(orgId: string, projectId: string, id: string) {
    await this.getOwnedProject(orgId, projectId);
    const unitType = await this.prisma.unitType.findFirst({
      where: { id, projectId },
    });
    if (!unitType) throw new NotFoundException('Unit type not found');
    return unitType;
  }

  /** The org's price-per-sqft denominator. Defaults to carpet. */
  private async orgPriceBasis(orgId: string): Promise<UnitPriceBasis> {
    const org = await this.prisma.organisation.findUnique({
      where: { id: orgId },
      select: { unitPriceBasis: true },
    });
    return org?.unitPriceBasis ?? 'carpet';
  }

  private async getOwnedUnit(orgId: string, projectId: string, id: string) {
    await this.getOwnedProject(orgId, projectId);
    const unit = await this.prisma.unit.findFirst({
      where: { id, projectId },
      include: UNIT_INCLUDE,
    });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  // `configuration` must be one of the caller org's `unit_type` catalog
  // labels. Same catalog the wizard and the [id]/units page read.
  /**
   * A project unit's configuration must be one the *project* actually has —
   * not merely something in the org catalog. The allowed set mirrors what the
   * two unit forms offer: the project's planned UnitType names, plus any
   * configuration already present on its units (imports and older projects
   * can carry labels that were never planned), plus the value the unit already
   * holds, so an edit can never be forced to rename an existing unit.
   *
   * The UI restricting the dropdown is not enough — this is the authority.
   */
  private async assertConfigurationForProject(
    projectId: string,
    configuration: string,
    currentValue?: string | null,
  ) {
    const label = configuration.trim();
    if (currentValue && label === currentValue) return;

    const [planned, onUnits] = await Promise.all([
      this.prisma.unitType.findMany({
        where: { projectId },
        select: { name: true },
      }),
      this.prisma.unit.findMany({
        where: { projectId, configuration: { not: null } },
        select: { configuration: true },
        distinct: ['configuration'],
      }),
    ]);

    const allowed = new Set<string>([
      ...planned.map((p) => p.name),
      ...onUnits.map((u) => u.configuration as string),
    ]);
    if (allowed.has(label)) return;

    throw new BadRequestException(
      allowed.size === 0
        ? `This project has no unit configurations yet. Add "${label}" to the project's unit types first.`
        : `"${label}" is not one of this project's configurations (${[...allowed].sort().join(', ')}).`,
    );
  }

  /**
   * The optional variant label ("Type A", "Corner"). Blank is always valid.
   * Validated against the org's `unit_variant` catalog, except when it's the
   * value the unit already carries — units created while this was free text
   * keep their label and stay editable.
   */
  private async assertVariantInCatalog(
    orgId: string,
    variantLabel: string | null | undefined,
    currentValue?: string | null,
  ) {
    const label = variantLabel?.trim();
    if (!label) return;
    if (currentValue && label === currentValue) return;

    const match = await this.prisma.orgCatalogOption.findFirst({
      where: { orgId, category: 'unit_variant', label },
      select: { id: true },
    });
    if (!match) {
      throw new BadRequestException(
        `"${label}" is not one of your unit variants. Add it in Settings → Project Catalogs first.`,
      );
    }
  }

  private async assertConfigurationInCatalog(
    orgId: string,
    configuration: string,
  ) {
    const label = configuration.trim();
    const match = await this.prisma.orgCatalogOption.findFirst({
      where: { orgId, category: 'unit_type', label },
      select: { id: true },
    });
    if (!match) {
      throw new BadRequestException(
        `"${label}" is not one of your unit configurations. Add it in Settings → Project Catalogs first.`,
      );
    }
  }

  // A new tower name may only be introduced while the project's distinct
  // tower count is below Project.towerCount. Reusing a name already in use,
  // or clearing the tower, is always fine. A null towerCount means the
  // project never declared a tower count — no limit is enforced.
  private async assertTowerWithinLimit(
    projectId: string,
    towerCount: number | null,
    nextTower: string | null,
    excludeUnitId?: string,
  ) {
    if (!nextTower || towerCount == null) return;

    const rows = await this.prisma.unit.findMany({
      where: {
        projectId,
        tower: { not: null },
        ...(excludeUnitId ? { id: { not: excludeUnitId } } : {}),
      },
      select: { tower: true },
      distinct: ['tower'],
    });
    const existing = rows
      .map((r) => r.tower)
      .filter((t): t is string => t != null);

    if (existing.includes(nextTower)) return;
    if (existing.length + 1 > towerCount) {
      throw new BadRequestException(
        `This project allows ${towerCount} tower(s) and already uses ${existing.length}` +
          (existing.length ? ` (${existing.join(', ')})` : '') +
          `. Reuse an existing tower name, or raise the tower count on the project before adding "${nextTower}".`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Serialisation / derived fields
  // -------------------------------------------------------------------------

  // A UnitType no longer owns Units. Its live counts come from Unit rows on
  // the same project whose `configuration` equals this type's `name` (both
  // are `unit_type` catalog labels). Never stored — always counted live.
  private async decorateUnitTypes(
    unitTypes: Prisma.UnitTypeGetPayload<Record<string, never>>[],
  ): Promise<UnitTypeWithCounts[]> {
    if (unitTypes.length === 0) return [];
    const projectIds = [...new Set(unitTypes.map((ut) => ut.projectId))];
    const grouped = await this.prisma.unit.groupBy({
      by: ['configuration', 'status'],
      where: { projectId: { in: projectIds }, configuration: { not: null } },
      _count: { _all: true },
    });

    type Row = {
      unitCount: number;
      available: number;
      booked: number;
      held: number;
      sold: number;
    };
    const byLabel = new Map<string, Row>();
    for (const g of grouped) {
      const label = g.configuration!;
      const entry =
        byLabel.get(label) ??
        { unitCount: 0, available: 0, booked: 0, held: 0, sold: 0 };
      const n = g._count._all;
      entry.unitCount += n;
      if (g.status === 'available') entry.available += n;
      else if (g.status === 'booked') entry.booked += n;
      else if (g.status === 'held') entry.held += n;
      else if (g.status === 'sold') entry.sold += n;
      byLabel.set(label, entry);
    }

    return unitTypes.map((ut) => {
      const c =
        byLabel.get(ut.name) ??
        { unitCount: 0, available: 0, booked: 0, held: 0, sold: 0 };
      return {
        ...ut,
        unitCount: c.unitCount,
        availableUnits: c.available,
        bookedUnits: c.booked,
        heldUnits: c.held,
        soldUnits: c.sold,
      };
    });
  }

  private serializeProject(project: ProjectRow) {
    const m = project.manager;
    const managerName = m
      ? [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email
      : null;
    return {
      id: project.id,
      orgId: project.orgId,
      name: project.name,
      location: project.location,
      reraId: project.reraId,
      possession: project.possession,
      managerId: project.managerId,
      // Expanded so the client can render a name without a second request.
      manager: m
        ? {
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            name: managerName,
          }
        : null,
      status: project.status,
      priceMin: project.priceMin,
      priceMax: project.priceMax,
      baseRate: project.baseRate,
      // Prisma.Decimal → number for a clean JSON contract.
      landArea: project.landArea == null ? null : Number(project.landArea),
      towerCount: project.towerCount,
      floorsDescription: project.floorsDescription,
      carpetRange: project.carpetRange,
      projectType: project.projectType,
      tagline: project.tagline,
      launchDate: project.launchDate,
      constructionStage: project.constructionStage,
      highlights: project.highlights,
      salesTeam: project.salesTeam,
      amenities: (project.amenities ?? []) as Array<{
        name: string;
        iconUrl: string | null;
      }>,
      // Onboarding-wizard fields (Steps 3-8).
      bookingAmount: project.bookingAmount,
      currency: project.currency,
      priceIncludes: project.priceIncludes,
      paymentPlan: project.paymentPlan,
      offers: project.offers,
      addressLine: project.addressLine,
      city: project.city,
      locality: project.locality,
      pincode: project.pincode,
      latitude: project.latitude,
      longitude: project.longitude,
      connectivity: project.connectivity,
      landmarks: project.landmarks,
      specifications: project.specifications,
      marketing: project.marketing,
      requireBookingApproval: project.requireBookingApproval,
      visibleToTelecallers: project.visibleToTelecallers,
      publishedToWebsite: project.publishedToWebsite,
      coverImageUrl: project.coverImageUrl,
      galleryUrls: project.galleryUrls,
      brochureUrl: project.brochureUrl,
      reraCertificateUrl: project.reraCertificateUrl,
      floorPlanUrls: project.floorPlanUrls,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private serializeUnitType(ut: UnitTypeWithCounts) {
    return {
      id: ut.id,
      projectId: ut.projectId,
      name: ut.name,
      carpetSqft: ut.carpetSqft,
      builtupSqft: ut.builtupSqft,
      price: ut.price,
      totalUnits: ut.totalUnits,
      // Media — always null / empty for now (upload is out of scope).
      floorPlanUrl: ut.floorPlanUrl,
      brochureUrl: ut.brochureUrl,
      videoUrl: ut.videoUrl,
      galleryUrls: ut.galleryUrls,
      unitCount: ut.unitCount,
      availableUnits: ut.availableUnits,
      bookedUnits: ut.bookedUnits,
      heldUnits: ut.heldUnits,
      soldUnits: ut.soldUnits,
      createdAt: ut.createdAt,
      updatedAt: ut.updatedAt,
    };
  }

  /** { id, name, email } for a unit's creator/editor, or null. */
  private serializeActor(
    actor: { id: string; firstName: string | null; lastName: string | null; email: string } | null,
  ) {
    if (!actor) return null;
    return {
      id: actor.id,
      name:
        [actor.firstName, actor.lastName].filter(Boolean).join(' ') ||
        actor.email,
      email: actor.email,
    };
  }

  /**
   * Price per sqft on the org's chosen denominator. Null (not zero) whenever
   * the price or the relevant area is missing — a blank cell is honest, a
   * zero is not. The basis travels with the number so no caller can render an
   * unlabelled figure: a per-sqft price on the wrong denominator is a real
   * commercial error.
   */
  private pricePerSqft(
    unit: { price: number | null; carpetSqft: number | null; builtupSqft: number | null },
    basis: UnitPriceBasis,
  ): number | null {
    const area = basis === 'builtup' ? unit.builtupSqft : unit.carpetSqft;
    if (!unit.price || !area) return null;
    return Math.round(unit.price / area);
  }

  private serializeUnit(unit: UnitRow, basis: UnitPriceBasis) {
    return {
      id: unit.id,
      orgId: unit.orgId,
      projectId: unit.projectId,
      configuration: unit.configuration,
      variantLabel: unit.variantLabel,
      unitNo: unit.unitNo,
      carpetSqft: unit.carpetSqft,
      builtupSqft: unit.builtupSqft,
      tower: unit.tower,
      floor: unit.floor,
      facing: unit.facing,
      parking: unit.parking,
      price: unit.price,
      pricePerSqft: this.pricePerSqft(unit, basis),
      pricePerSqftBasis: basis,
      addressLine: unit.addressLine,
      ownerName: unit.ownerName,
      notes: unit.notes,
      floorPlanUrl: unit.floorPlanUrl,
      galleryUrls: unit.galleryUrls,
      status: unit.status,
      createdById: unit.createdById,
      updatedById: unit.updatedById,
      createdBy: this.serializeActor(unit.createdBy),
      updatedBy: this.serializeActor(unit.updatedBy),
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    };
  }
}
