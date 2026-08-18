import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MasterDataCategoryType, MasterStatus } from '@prisma/client';

export class MasterDataEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: MasterDataCategoryType })
  type!: MasterDataCategoryType;

  @ApiProperty()
  value!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiPropertyOptional()
  parentId!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional({ type: Object })
  metadata!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ enum: MasterStatus })
  status!: MasterStatus;

  @ApiProperty()
  updatedAt!: string;
}

export class MasterDataSearchResultEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: MasterDataCategoryType })
  type!: MasterDataCategoryType;

  @ApiProperty()
  value!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiPropertyOptional()
  parentId!: string | null;
}

export class CitySearchResultEntity extends MasterDataSearchResultEntity {}

export class PaginatedMasterDataResponse {
  @ApiProperty({ type: [MasterDataEntity] })
  items!: MasterDataEntity[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
