import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MasterDataCategoryType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class GetChildrenBySlugQueryDto {
  @ApiProperty({
    enum: MasterDataCategoryType,
    description: 'Type of child records to return',
  })
  @IsEnum(MasterDataCategoryType)
  childType!: MasterDataCategoryType;

  @ApiPropertyOptional({
    enum: MasterDataCategoryType,
    description: 'Optional parent type to disambiguate duplicate slugs',
  })
  @IsOptional()
  @IsEnum(MasterDataCategoryType)
  type?: MasterDataCategoryType;
}
