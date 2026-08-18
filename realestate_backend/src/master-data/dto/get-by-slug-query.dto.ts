import { ApiPropertyOptional } from '@nestjs/swagger';
import { MasterDataCategoryType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class GetBySlugQueryDto {
  @ApiPropertyOptional({ enum: MasterDataCategoryType })
  @IsOptional()
  @IsEnum(MasterDataCategoryType)
  type?: MasterDataCategoryType;
}
