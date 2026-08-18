// src/ads/dto/campaign-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignType, CampaignStatus, PricingModel, AdEntityType } from '@prisma/client';

export class CampaignResponseDto {
    @ApiProperty() id: string;
    @ApiProperty() organizationId: string;
    @ApiProperty() name: string;
    @ApiProperty({ enum: CampaignType }) type: CampaignType;
    @ApiPropertyOptional({ enum: AdEntityType }) entityType: AdEntityType | null;
    @ApiPropertyOptional() entityId: string | null;
    @ApiProperty({ enum: PricingModel }) pricingModel: PricingModel;
    @ApiProperty({ enum: CampaignStatus }) status: CampaignStatus;
    @ApiProperty() budgetTotal: string;
    @ApiProperty() budgetSpent: string;
    @ApiPropertyOptional() costPerClick: string | null;
    @ApiPropertyOptional() costPerThousandImpressions: string | null;
    @ApiPropertyOptional() flatFee: string | null;
    @ApiPropertyOptional() dailyLimit: string | null;
    @ApiPropertyOptional() startDate: Date | null;
    @ApiPropertyOptional() endDate: Date | null;
    @ApiProperty() boostScore: number;
    @ApiProperty() isArchived: boolean;
    @ApiPropertyOptional() rejectionReason: string | null;
    @ApiProperty() createdAt: Date;
    @ApiProperty() updatedAt: Date;
}

export class PaginatedCampaignsResponseDto {
    @ApiProperty({ type: [CampaignResponseDto] }) campaigns: CampaignResponseDto[];
    @ApiProperty() total: number;
    @ApiProperty() page: number;
    @ApiProperty() limit: number;
    @ApiProperty() totalPages: number;
}
