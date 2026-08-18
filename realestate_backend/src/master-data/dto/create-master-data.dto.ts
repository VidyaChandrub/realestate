import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma, MasterDataCategoryType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { MasterStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateMasterDataDto {
  @ApiProperty({ enum: MasterDataCategoryType })
  @IsEnum(MasterDataCategoryType)
  type!: MasterDataCategoryType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  value!: string;

  @ApiProperty({ description: 'URL-safe slug; unique per type' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent category ID for hierarchical taxonomy' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Prisma.InputJsonValue | null;

  @ApiPropertyOptional({ enum: MasterStatus, default: MasterStatus.DRAFT })
  @IsOptional()
  @Transform(({ value }) => (value === 'CLOSED' ? 'INACTIVE' : value))
  @IsEnum(MasterStatus)
  status?: MasterStatus;
}
