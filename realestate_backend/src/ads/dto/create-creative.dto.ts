// src/ads/dto/create-creative.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class CreateCreativeDto {
    @ApiProperty({ description: 'URL of the image or video asset' })
    @IsUrl()
    @IsNotEmpty()
    mediaUrl: string;

    @ApiPropertyOptional({ description: 'URL of the video thumbnail (for VIDEO campaigns)' })
    @IsOptional()
    @IsUrl()
    thumbnailUrl?: string;

    @ApiProperty({ example: 'Find your next healthcare role' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    headline: string;

    @ApiPropertyOptional({ example: 'Browse 500+ verified clinical jobs' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiProperty({ example: 'Apply Now' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    ctaText: string;

    @ApiProperty({ example: 'https://example.com/jobs/123' })
    @IsUrl()
    @IsNotEmpty()
    ctaUrl: string;
}
