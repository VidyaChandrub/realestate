// src/ads/repositories/creatives.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma, Creative } from '@prisma/client';
import { AdsDbService } from '../prisma.service';

@Injectable()
export class CreativesRepository {
    constructor(private readonly db: AdsDbService) { }

    async create(data: Prisma.CreativeCreateInput): Promise<Creative> {
        return this.db.creative.create({ data });
    }

    async findAllByCampaign(campaignId: string): Promise<Creative[]> {
        return this.db.creative.findMany({ where: { campaignId }, orderBy: { createdAt: 'asc' } });
    }

    async update(id: string, data: Prisma.CreativeUpdateInput): Promise<Creative> {
        return this.db.creative.update({ where: { id }, data });
    }
}
