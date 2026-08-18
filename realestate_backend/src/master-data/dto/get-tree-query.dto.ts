import { ApiProperty } from '@nestjs/swagger';
import { MasterDataCategoryType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class GetTreeQueryDto {
  @ApiProperty({ enum: MasterDataCategoryType })
  @IsEnum(MasterDataCategoryType)
  type!: MasterDataCategoryType;
}
