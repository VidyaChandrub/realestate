import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTypographySetDto } from '../org-typography-sets/dto/create-typography-set.dto';
import { UpdateTypographySetDto } from '../org-typography-sets/dto/update-typography-set.dto';

@Injectable()
export class AdminTypographySetsService {
  constructor(private readonly prisma: PrismaService) {}

  // Platform sets only — Super Admin manages the shared/house-style library,
  // not any individual org's sets (nothing in the confirmed scoping model
  // calls for that visibility).
  async list() {
    return this.prisma.typographySet.findMany({
      where: { orgId: null },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateTypographySetDto) {
    try {
      return await this.prisma.typographySet.create({
        data: { orgId: null, name: dto.name, tokens: dto.tokens as any },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('A platform set with that name already exists');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateTypographySetDto) {
    await this.getPlatformSet(id);
    const data: { name?: string; tokens?: any } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.tokens !== undefined) data.tokens = dto.tokens;

    try {
      return await this.prisma.typographySet.update({ where: { id }, data });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('A platform set with that name already exists');
      }
      throw err;
    }
  }

  async remove(id: string) {
    await this.getPlatformSet(id);
    await this.prisma.typographySet.delete({ where: { id } });
    return { success: true };
  }

  private async getPlatformSet(id: string) {
    const set = await this.prisma.typographySet.findUnique({ where: { id } });
    if (!set || set.orgId !== null) {
      throw new NotFoundException('Typography set not found');
    }
    return set;
  }
}
