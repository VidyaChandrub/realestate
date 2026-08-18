// src/ads/entities/creative.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Creative } from '@prisma/client';

export class CreativeEntity implements Creative {
    @ApiProperty() id: string;
    @ApiProperty() campaignId: string;
    @ApiProperty() mediaUrl: string;
    @ApiPropertyOptional() thumbnailUrl: string | null;
    @ApiProperty() headline: string;
    @ApiPropertyOptional() description: string | null;
    @ApiProperty() ctaText: string;
    @ApiProperty() ctaUrl: string;
    @ApiProperty() createdAt: Date;
    @ApiProperty() updatedAt: Date;
}
