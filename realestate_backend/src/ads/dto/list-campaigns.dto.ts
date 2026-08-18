// src/ads/dto/list-campaigns.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignStatus, CampaignType } from '@prisma/client';

export class ListCampaignsDto {
    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ example: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({ enum: CampaignStatus })
    @IsOptional()
    @IsEnum(CampaignStatus)
    status?: CampaignStatus;

    @ApiPropertyOptional({ enum: CampaignType })
    @IsOptional()
    @IsEnum(CampaignType)
    type?: CampaignType;

    @ApiPropertyOptional({ description: 'Include archived campaigns', default: false })
    @IsOptional()
    @Type(() => Boolean)
    includeArchived?: boolean = false;
}
