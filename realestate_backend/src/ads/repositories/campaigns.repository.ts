// src/ads/repositories/campaigns.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma, Campaign, CampaignStatus } from '@prisma/client';
import { AdsDbService } from '../prisma.service';
import { ListCampaignsDto } from '../dto/list-campaigns.dto';

@Injectable()
export class CampaignsRepository {
    constructor(private readonly db: AdsDbService) { }

    async findFeedEligibleCampaigns(now: Date, limit: number, excludedCampaignIds: string[] = []) {
        return this.db.campaign.findMany({
            where: {
                status: CampaignStatus.ACTIVE,
                isArchived: false,
                ...(excludedCampaignIds.length > 0 ? { id: { notIn: excludedCampaignIds } } : {}),
                OR: [{ startDate: null }, { startDate: { lte: now } }],
                AND: [{ OR: [{ endDate: null }, { endDate: { gt: now } }] }],
            },
            include: {
                creatives: true,
                targetingRule: true,
                deliveryStats: true,
            },
            orderBy: [{ boostScore: 'desc' }, { createdAt: 'desc' }],
            take: limit,
        });
    }

    async create(data: Prisma.CampaignCreateInput): Promise<Campaign> {
        return this.db.campaign.create({ data });
    }

    async findById(id: string): Promise<Campaign | null> {
        return this.db.campaign.findUnique({ where: { id } });
    }

    async findByIdWithRelations(id: string) {
        return this.db.campaign.findUnique({
            where: { id },
            include: { creatives: true, targetingRule: true, deliveryStats: true },
        });
    }

    async findAllByOrg(
        organizationId: string,
        query: ListCampaignsDto,
    ): Promise<{ campaigns: Campaign[]; total: number }> {
        const { page = 1, limit = 20, status, type, includeArchived = false } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.CampaignWhereInput = {
            organizationId,
            ...(status ? { status } : {}),
            ...(type ? { type } : {}),
            ...(includeArchived ? {} : { isArchived: false }),
        };

        const [campaigns, total] = await this.db.$transaction([
            this.db.campaign.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { creatives: true, targetingRule: true },
            }),
            this.db.campaign.count({ where }),
        ]);

        return { campaigns, total };
    }

    async update(id: string, data: Prisma.CampaignUpdateInput): Promise<Campaign> {
        return this.db.campaign.update({ where: { id }, data });
    }

    /**
     * Atomically increment budgetSpent and check it doesn't exceed budgetTotal.
     * Returns the updated campaign.
     */
    async incrementSpend(id: string, amount: Prisma.Decimal): Promise<Campaign> {
        return this.db.campaign.update({
            where: { id },
            data: {
                budgetSpent: { increment: amount },
            },
        });
    }

    async transitionStatus(id: string, status: CampaignStatus, extra?: Prisma.CampaignUpdateInput): Promise<Campaign> {
        return this.db.campaign.update({
            where: { id },
            data: { status, ...extra },
        });
    }
}
