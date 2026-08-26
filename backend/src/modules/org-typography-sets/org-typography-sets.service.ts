import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTypographySetDto } from './dto/create-typography-set.dto';
import { UpdateTypographySetDto } from './dto/update-typography-set.dto';

@Injectable()
export class OrgTypographySetsService {
  constructor(private readonly prisma: PrismaService) {}

  // Platform sets (orgId: null) plus the caller's own org sets, in one list
  // — an org admin sees both, never another org's. `scope` lets the UI tell
  // them apart (platform sets render read-only).
  async list(orgId: string) {
    const rows = await this.prisma.typographySet.findMany({
      where: { OR: [{ orgId: null }, { orgId }] },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => ({
      ...row,
      scope: row.orgId === null ? ('platform' as const) : ('org' as const),
    }));
  }

  async create(orgId: string, dto: CreateTypographySetDto) {
    try {
      return await this.prisma.typographySet.create({
        data: { orgId, name: dto.name, tokens: dto.tokens as any },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('You already have a set with that name');
      }
      throw err;
    }
  }

  async update(orgId: string, id: string, dto: UpdateTypographySetDto) {
    const set = await this.getOwned(orgId, id);
    const data: { name?: string; tokens?: any } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.tokens !== undefined) data.tokens = dto.tokens;

    try {
      return await this.prisma.typographySet.update({ where: { id: set.id }, data });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('You already have a set with that name');
      }
      throw err;
    }
  }

  async remove(orgId: string, id: string) {
    const set = await this.getOwned(orgId, id);
    await this.prisma.typographySet.delete({ where: { id: set.id } });
    return { success: true };
  }

  // Never leaks cross-tenant existence: a foreign org's set 404s exactly
  // the same as an id that doesn't exist at all. A platform set is found
  // (so the caller learns it exists) but rejected with 403 — an org must
  // know platform sets exist, it's the mutation that's disallowed.
  private async getOwned(orgId: string, id: string) {
    const set = await this.prisma.typographySet.findUnique({ where: { id } });
    if (!set || (set.orgId !== null && set.orgId !== orgId)) {
      throw new NotFoundException('Typography set not found');
    }
    if (set.orgId === null) {
      throw new ForbiddenException('Platform sets cannot be modified by an organisation');
    }
    return set;
  }
}
