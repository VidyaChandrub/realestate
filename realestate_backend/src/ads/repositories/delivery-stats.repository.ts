// src/ads/repositories/delivery-stats.repository.ts
import { Injectable } from '@nestjs/common';
import { DeliveryStats } from '@prisma/client';
import { AdsDbService } from '../prisma.service';

@Injectable()
export class DeliveryStatsRepository {
    constructor(private readonly db: AdsDbService) { }

    async findByCampaign(campaignId: string): Promise<DeliveryStats | null> {
        return this.db.deliveryStats.findUnique({ where: { campaignId } });
    }

    async ensureExists(campaignId: string): Promise<DeliveryStats> {
        return this.db.deliveryStats.upsert({
            where: { campaignId },
            update: {},
            create: {
                campaign: { connect: { id: campaignId } },
                impressions: 0,
                clicks: 0,
                videoCompletions: 0,
            },
        });
    }

    async incrementImpressions(campaignId: string, count = 1): Promise<DeliveryStats> {
        return this.db.deliveryStats.update({
            where: { campaignId },
            data: {
                impressions: { increment: count },
                lastUpdatedAt: new Date(),
            },
        });
    }

    async incrementClicks(campaignId: string, count = 1): Promise<DeliveryStats> {
        return this.db.deliveryStats.update({
            where: { campaignId },
            data: {
                clicks: { increment: count },
                lastUpdatedAt: new Date(),
            },
        });
    }

    async incrementVideoCompletions(campaignId: string, count = 1): Promise<DeliveryStats> {
        return this.db.deliveryStats.update({
            where: { campaignId },
            data: {
                videoCompletions: { increment: count },
                lastUpdatedAt: new Date(),
            },
        });
    }
}
