import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const SYSTEM_ROLES = new Set(['super_admin', 'admin', 'manager', 'sales', 'telecaller']);

@Injectable()
export class AdminRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.role.findMany({
      where: { orgId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });
  }

  async create(dto: CreateRoleDto) {
    const rawKey = dto.key
      ? dto.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : dto.name.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');

    const existing = await this.prisma.role.findFirst({
      where: { orgId: null, key: rawKey },
    });
    if (existing) {
      throw new ConflictException(`Role key '${rawKey}' already exists`);
    }

    const count = await this.prisma.role.count();

    return this.prisma.role.create({
      data: {
        key: rawKey,
        name: dto.name,
        description: dto.description ?? '',
        scope: dto.scope ?? 'team',
        status: 'active',
        sortOrder: count + 1,
      },
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { userRoles: true } } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (SYSTEM_ROLES.has(role.key)) {
      throw new BadRequestException(`System role '${role.name}' cannot be deleted`);
    }

    if (role._count.userRoles > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because ${role._count.userRoles} user(s) are currently assigned to it`,
      );
    }

    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }
}
