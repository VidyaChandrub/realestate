// src/ads/entities/targeting-rule.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TargetingRule } from '@prisma/client';
import type { JsonValue } from '@prisma/client/runtime/library';

export class TargetingRuleEntity implements TargetingRule {
    @ApiProperty() id: string;
    @ApiProperty() campaignId: string;
    @ApiProperty({ type: 'array', items: { type: 'string' } }) countryIds: string[];
    @ApiProperty({ type: 'array', items: { type: 'string' } }) stateIds: string[];
    @ApiProperty({ type: 'array', items: { type: 'string' } }) cityIds: string[];
    @ApiProperty({ type: 'array', items: { type: 'string' } }) educationLevelIds: string[];
    @ApiProperty({ type: 'array', items: { type: 'string' } }) experienceLevelIds: string[];
    @ApiProperty({ type: 'array', items: { type: 'string' } }) interestIds: string[];
    @ApiPropertyOptional() demographicExtensions: JsonValue;
    @ApiProperty() createdAt: Date;
    @ApiProperty() updatedAt: Date;
}
