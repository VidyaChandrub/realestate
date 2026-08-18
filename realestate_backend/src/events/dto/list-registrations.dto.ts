// src/events/dto/list-registrations.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, Min, IsArray, IsUUID, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListRegistrationsDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsInt()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Number of results per page (max 200)', default: 100 })
    @IsInt()
    @IsPositive()
    @IsOptional()
    @Type(() => Number)
    limit?: number = 100;

    @ApiPropertyOptional({
        description: 'Search by full name or email',
        example: 'john doe',
    })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({
        description: 'Filter by country ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsOptional()
    @IsUUID('4')
    countryId?: string;

    @ApiPropertyOptional({
        description: 'Filter by multiple country IDs',
        isArray: true,
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined) return undefined;
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return [value];
        return undefined;
    })
    @IsArray()
    @IsUUID('4', { each: true })
    countryIds?: string[];

    @ApiPropertyOptional({
        description: 'Filter by state IDs',
        isArray: true,
        example: ['123e4567-e89b-12d3-a456-426614174000'],
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined) return undefined;
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return [value];
        return undefined;
    })
    @IsArray()
    @IsUUID('4', { each: true })
    stateIds?: string[];

    @ApiPropertyOptional({
        description: 'Filter by city IDs',
        isArray: true,
        example: ['123e4567-e89b-12d3-a456-426614174000'],
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined) return undefined;
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return [value];
        return undefined;
    })
    @IsArray()
    @IsUUID('4', { each: true })
    cityIds?: string[];

    @ApiPropertyOptional({
        description: 'Filter by skill IDs',
        isArray: true,
        example: ['123e4567-e89b-12d3-a456-426614174000'],
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined) return undefined;
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return [value];
        return undefined;
    })
    @IsArray()
    @IsUUID('4', { each: true })
    skillIds?: string[];

    @ApiPropertyOptional({
        description: 'Filter by experience level IDs',
        isArray: true,
        example: ['123e4567-e89b-12d3-a456-426614174000'],
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined) return undefined;
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return [value];
        return undefined;
    })
    @IsArray()
    @IsUUID('4', { each: true })
    experienceIds?: string[];

    @ApiPropertyOptional({
        description: 'Filter by education level IDs',
        isArray: true,
        example: ['123e4567-e89b-12d3-a456-426614174000'],
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined) return undefined;
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return [value];
        return undefined;
    })
    @IsArray()
    @IsUUID('4', { each: true })
    educationIds?: string[];

    @ApiPropertyOptional({
        description: 'Filter by specialization IDs',
        isArray: true,
        example: ['123e4567-e89b-12d3-a456-426614174000'],
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined) return undefined;
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return [value];
        return undefined;
    })
    @IsArray()
    @IsUUID('4', { each: true })
    specializationIds?: string[];
    @ApiPropertyOptional({
        description: 'Filter by year of passing',
        example: '2020',
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined) return undefined;
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') return [value];
        return undefined;
    })
    @IsArray()
    @IsString({ each: true })
    yearOfPassing?: string[];
}
