import { IsString, IsOptional, IsEnum, IsDateString, IsUrl, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  AdPlacement,
  AdStatus,
  AdDisplayType,
  AdMediaType,
  AdCtaButtonStyle,
  AdCtaButtonSize,
  AdCtaButtonPlacement,
} from '../entities/advertisement.entity';

export class AdvertisementMediaDto {
  @IsString()
  mediaUrl: string;

  @IsEnum(AdMediaType)
  mediaType: AdMediaType;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  altText?: string;
}

export class CreateAdvertisementDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  redirectUrl?: string;

  @IsOptional()
  @IsString()
  ctaText?: string;

  @IsOptional()
  @IsString()
  ctaTextColor?: string;

  @IsOptional()
  @IsString()
  ctaBackgroundColor?: string;

  @IsOptional()
  @IsEnum(AdCtaButtonStyle)
  ctaButtonStyle?: AdCtaButtonStyle;

  @IsOptional()
  @IsEnum(AdCtaButtonSize)
  ctaButtonSize?: AdCtaButtonSize;

  @IsOptional()
  @IsEnum(AdCtaButtonPlacement)
  ctaButtonPlacement?: AdCtaButtonPlacement;

  @IsDateString()
  startDateTime: string;

  @IsDateString()
  endDateTime: string;

  @IsEnum(AdPlacement)
  placement: AdPlacement;

  @IsInt()
  priority: number;

  @IsEnum(AdStatus)
  status: AdStatus;

  @IsEnum(AdDisplayType)
  displayType: AdDisplayType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdvertisementMediaDto)
  media?: AdvertisementMediaDto[];

  @IsOptional()
  @IsString({ each: true })
  countryIds?: string[];

  @IsOptional()
  @IsString({ each: true })
  stateIds?: string[];

  @IsOptional()
  @IsString({ each: true })
  cityIds?: string[];

  @IsOptional()
  @IsString({ each: true })
  skillIds?: string[];

  @IsOptional()
  @IsString({ each: true })
  experienceLevelIds?: string[];

  @IsOptional()
  @IsString({ each: true })
  educationLevelIds?: string[];

  @IsOptional()
  @IsString({ each: true })
  specializationIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  yearOfPassing?: string[];
}
