// src/ads/dto/create-campaign.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsPositive,
    IsDateString,
    IsUUID,
    Min,
    ValidateIf,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignType, AdEntityType, PricingModel } from '@prisma/client';

export class CreateCampaignDto {
    @ApiProperty({ example: 'Summer Healthcare Campaign' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string;

    @ApiProperty({ enum: CampaignType })
    @IsEnum(CampaignType)
    type: CampaignType;

    @ApiPropertyOptional({ enum: AdEntityType, description: 'Required for SPONSORED_JOB and SPONSORED_EVENT types' })
    @IsOptional()
    @IsEnum(AdEntityType)
    entityType?: AdEntityType;

    @ApiPropertyOptional({ description: 'UUID of the sponsored Job or Event' })
    @IsOptional()
    @IsUUID()
    entityId?: string;

    @ApiProperty({ enum: PricingModel })
    @IsEnum(PricingModel)
    pricingModel: PricingModel;

    @ApiProperty({ example: 5000, description: 'Total budget in currency units (e.g. INR)' })
    @IsNumber({ maxDecimalPlaces: 4 })
    @IsPositive()
    @Type(() => Number)
    budgetTotal: number;

    @ApiPropertyOptional({ example: 10, description: 'Required when pricingModel = CPC' })
    @ValidateIf((o) => o.pricingModel === PricingModel.CPC)
    @IsNumber({ maxDecimalPlaces: 4 })
    @IsPositive()
    @Type(() => Number)
    costPerClick?: number;

    @ApiPropertyOptional({ example: 150, description: 'Required when pricingModel = CPM' })
    @ValidateIf((o) => o.pricingModel === PricingModel.CPM)
    @IsNumber({ maxDecimalPlaces: 4 })
    @IsPositive()
    @Type(() => Number)
    costPerThousandImpressions?: number;

    @ApiPropertyOptional({ example: 9999, description: 'Required when pricingModel = TIME_BASED' })
    @ValidateIf((o) => o.pricingModel === PricingModel.TIME_BASED)
    @IsNumber({ maxDecimalPlaces: 4 })
    @IsPositive()
    @Type(() => Number)
    flatFee?: number;

    @ApiPropertyOptional({ example: 500, description: 'Maximum spend per day (optional)' })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 4 })
    @IsPositive()
    @Type(() => Number)
    dailyLimit?: number;

    @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ example: '2026-08-31T23:59:59.000Z' })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}
