// src/ads/entities/campaign.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Campaign, CampaignType, CampaignStatus, PricingModel, AdEntityType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class CampaignEntity implements Campaign {
    @ApiProperty() id: string;
    @ApiProperty() organizationId: string;
    @ApiProperty() name: string;
    @ApiProperty({ enum: CampaignType }) type: CampaignType;
    @ApiPropertyOptional({ enum: AdEntityType }) entityType: AdEntityType | null;
    @ApiPropertyOptional() entityId: string | null;
    @ApiProperty({ enum: PricingModel }) pricingModel: PricingModel;
    @ApiProperty({ enum: CampaignStatus }) status: CampaignStatus;
    @ApiProperty() budgetTotal: Decimal;
    @ApiProperty() budgetSpent: Decimal;
    @ApiPropertyOptional() costPerClick: Decimal | null;
    @ApiPropertyOptional() costPerThousandImpressions: Decimal | null;
    @ApiPropertyOptional() flatFee: Decimal | null;
    @ApiPropertyOptional() dailyLimit: Decimal | null;
    @ApiPropertyOptional() startDate: Date | null;
    @ApiPropertyOptional() endDate: Date | null;
    @ApiProperty() boostScore: number;
    @ApiProperty() isArchived: boolean;
    @ApiPropertyOptional() rejectionReason: string | null;
    @ApiProperty() createdAt: Date;
    @ApiProperty() updatedAt: Date;
}
