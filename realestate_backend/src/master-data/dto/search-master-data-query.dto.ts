import { ApiPropertyOptional } from '@nestjs/swagger';
import { MasterDataCategoryType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class SearchMasterDataQueryDto {
  @ApiPropertyOptional({
    description: 'Master data search term. Minimum 3 characters.',
    minLength: 3,
    example: 'ban',
  })
  @IsString()
  @MinLength(1)
  value!: string;

  @ApiPropertyOptional({
    description: 'Optional master data type filter.',
    enum: MasterDataCategoryType,
  })
  @IsOptional()
  @IsEnum(MasterDataCategoryType)
  type?: MasterDataCategoryType;

  @ApiPropertyOptional({
    description: 'Optional parent master data ID filter.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
