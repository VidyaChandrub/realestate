// src/ads/entities/delivery-stats.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import { DeliveryStats } from '@prisma/client';

export class DeliveryStatsEntity implements DeliveryStats {
    @ApiProperty() campaignId: string;
    @ApiProperty() impressions: bigint;
    @ApiProperty() clicks: bigint;
    @ApiProperty() videoCompletions: bigint;
    @ApiProperty() lastUpdatedAt: Date;
    @ApiProperty() updatedAt: Date;
}
