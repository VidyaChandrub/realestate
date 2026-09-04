import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
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

    const rollup = decorated.reduce(
      (acc, ut) => {
        acc.totalUnitsPlanned += ut.totalUnits;
        acc.unitsCreated += ut.unitCount;
        acc.unitsAvailable += ut.availableUnits;
        acc.unitsBooked += ut.bookedUnits;
        acc.unitsHeld += ut.heldUnits;
        return acc;
      },
      {
        totalUnitsPlanned: 0,
        unitsCreated: 0,
        unitsAvailable: 0,
        unitsBooked: 0,
        unitsHeld: 0,
      },
    );

    return {
      ...this.serializeProject(project),
      unitTypes: decorated.map((ut) => this.serializeUnitType(ut)),
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

  async createUnit(orgId: string, projectId: string, dto: CreateUnitDto) {
    // unitTypeId must be a real type under *this* project (and therefore
    // this org) — never trusted from the body without the check.
    await this.getOwnedUnitType(orgId, projectId, dto.unitTypeId);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.unit.create({
        data: {
          unitTypeId: dto.unitTypeId,
          unitNo: dto.unitNo,
          tower: dto.tower?.trim() || null,
          floor: dto.floor ?? null,
          facing: dto.facing ?? null,
          price: dto.price ?? null,
          status: dto.status ?? 'available',
        },
      });
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'unit_created',
          entity: 'Unit',
          entityId: row.id,
          metadata: {
            projectId,
            unitTypeId: row.unitTypeId,
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

    const where: Prisma.UnitWhereInput = { unitType: { projectId } };
    if (query.unitTypeId) where.unitTypeId = query.unitTypeId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.unitNo = { contains: query.search, mode: 'insensitive' };
    }

    const rows = await this.prisma.unit.findMany({
      where,
      orderBy: [{ unitNo: 'asc' }],
      include: { unitType: { select: { id: true, name: true } } },
    });

    return rows.map((row) => this.serializeUnit(row));
  }

  async getUnit(orgId: string, projectId: string, id: string) {
    const row = await this.getOwnedUnit(orgId, projectId, id);
    return this.serializeUnit(row);
  }

  async updateUnit(
    orgId: string,
    projectId: string,
    id: string,
    dto: UpdateUnitDto,
  ) {
    await this.getOwnedUnit(orgId, projectId, id);

    if (dto.unitTypeId !== undefined) {
      // Re-parent only within the same project.
      await this.getOwnedUnitType(orgId, projectId, dto.unitTypeId);
    }

    const data: Prisma.UnitUpdateInput = {};
    if (dto.unitTypeId !== undefined) {
      data.unitType = { connect: { id: dto.unitTypeId } };
    }
    if (dto.unitNo !== undefined) data.unitNo = dto.unitNo;
    if (dto.tower !== undefined) {
      data.tower =
        typeof dto.tower === 'string' ? dto.tower.trim() || null : null;
    }
    if (dto.floor !== undefined) data.floor = dto.floor;
    if (dto.facing !== undefined) data.facing = dto.facing;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.status !== undefined) data.status = dto.status;

    await this.prisma.$transaction(async (tx) => {
      await tx.unit.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          orgId,
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
  ) {
    const current = await this.getOwnedUnit(orgId, projectId, id);
    if (current.status === dto.status) {
      return this.serializeUnit(current);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.unit.update({ where: { id }, data: { status: dto.status } });
      await tx.auditLog.create({
        data: {
          orgId,
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
  // never trusted from the body. Mirrors createUnit's unitTypeId check.
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

  private async getOwnedUnit(orgId: string, projectId: string, id: string) {
    await this.getOwnedProject(orgId, projectId);
    const unit = await this.prisma.unit.findFirst({
      where: { id, unitType: { projectId } },
      include: { unitType: { select: { id: true, name: true } } },
    });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  // -------------------------------------------------------------------------
  // Serialisation / derived fields
  // -------------------------------------------------------------------------

  // availableUnits/bookedUnits/heldUnits are NOT stored — they're counted
  // live from the Unit rows so a stored figure can never drift from reality.
  private async decorateUnitTypes(
    unitTypes: Prisma.UnitTypeGetPayload<Record<string, never>>[],
  ): Promise<UnitTypeWithCounts[]> {
    if (unitTypes.length === 0) return [];
    const ids = unitTypes.map((ut) => ut.id);
    const grouped = await this.prisma.unit.groupBy({
      by: ['unitTypeId', 'status'],
      where: { unitTypeId: { in: ids } },
      _count: { _all: true },
    });

    const counts = new Map<
      string,
      { unitCount: number; available: number; booked: number; held: number }
    >();
    for (const id of ids) {
      counts.set(id, { unitCount: 0, available: 0, booked: 0, held: 0 });
    }
    for (const g of grouped) {
      const entry = counts.get(g.unitTypeId)!;
      const n = g._count._all;
      entry.unitCount += n;
      if (g.status === 'available') entry.available += n;
      else if (g.status === 'booked') entry.booked += n;
      else if (g.status === 'held') entry.held += n;
    }

    return unitTypes.map((ut) => {
      const c = counts.get(ut.id)!;
      return {
        ...ut,
        unitCount: c.unitCount,
        availableUnits: c.available,
        bookedUnits: c.booked,
        heldUnits: c.held,
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
      createdAt: ut.createdAt,
      updatedAt: ut.updatedAt,
    };
  }

  private serializeUnit(
    unit: Prisma.UnitGetPayload<{
      include: { unitType: { select: { id: true; name: true } } };
    }>,
  ) {
    return {
      id: unit.id,
      unitTypeId: unit.unitTypeId,
      unitType: unit.unitType,
      unitNo: unit.unitNo,
      tower: unit.tower,
      floor: unit.floor,
      facing: unit.facing,
      price: unit.price,
      status: unit.status,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    };
  }
}
