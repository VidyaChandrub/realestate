// src/ads/dto/update-targeting.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class UpdateTargetingDto {
    @ApiPropertyOptional({ type: [String], example: ['11111111-1111-1111-1111-111111111111'] })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    countryIds?: string[];

    @ApiPropertyOptional({ type: [String], example: ['11111111-1111-1111-1111-111111111111'] })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    stateIds?: string[];

    @ApiPropertyOptional({ type: [String], example: ['11111111-1111-1111-1111-111111111111'] })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    cityIds?: string[];

    @ApiPropertyOptional({ type: [String], example: ['22222222-2222-2222-2222-222222222222'] })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    educationLevelIds?: string[];

    @ApiPropertyOptional({ type: [String], example: ['33333333-3333-3333-3333-333333333333'] })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    experienceLevelIds?: string[];

    @ApiPropertyOptional({ type: [String], example: ['44444444-4444-4444-4444-444444444444'] })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    interestIds?: string[];

    @ApiPropertyOptional({ description: 'Arbitrary JSON object for future demographic extensions' })
    @IsOptional()
    demographicExtensions?: Record<string, unknown>;
}
