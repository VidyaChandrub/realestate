import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_ATTRIBUTION_LABELS } from '../../common/utils/lead-attribution.util';
import {
  CreateAttributionLabelDto,
  UpdateAttributionLabelDto,
} from './dto/update-attribution-label.dto';

@Injectable()
export class AttributionLabelsService implements OnModuleInit {
  private readonly logger = new Logger(AttributionLabelsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureDefaults();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not seed attribution labels: ${message}`);
    }
  }

  /** Idempotent seed so fresh DBs and older installs get the catalog. */
  async ensureDefaults() {
    for (const row of DEFAULT_ATTRIBUTION_LABELS) {
      await this.prisma.platformAttributionLabel.upsert({
        where: { key: row.key },
        create: {
          key: row.key,
          label: row.label,
          sortOrder: row.sortOrder,
          enabled: row.enabled,
        },
        update: {},
      });
    }
  }

  async listAll() {
    await this.ensureDefaults();
    return this.prisma.platformAttributionLabel.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  /** Labels enabled by Super Admin — what orgs see in Lead Center. */
  async listEnabled() {
    await this.ensureDefaults();
    return this.prisma.platformAttributionLabel.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      select: {
        id: true,
        key: true,
        label: true,
        sortOrder: true,
      },
    });
  }

  async create(dto: CreateAttributionLabelDto) {
    const key = dto.key.trim().toLowerCase();
    const label = dto.label.trim();
    if (!key || !label) {
      throw new BadRequestException('key and label are required');
    }
    const maxSort = await this.prisma.platformAttributionLabel.aggregate({
      _max: { sortOrder: true },
    });
    try {
      return await this.prisma.platformAttributionLabel.create({
        data: {
          key,
          label,
          enabled: dto.enabled ?? true,
          sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 10,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(`Label key "${key}" already exists`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateAttributionLabelDto) {
    const existing = await this.prisma.platformAttributionLabel.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Attribution label not found');

    return this.prisma.platformAttributionLabel.update({
      where: { id },
      data: {
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.platformAttributionLabel.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Attribution label not found');
    await this.prisma.platformAttributionLabel.delete({ where: { id } });
    return { ok: true };
  }
}
