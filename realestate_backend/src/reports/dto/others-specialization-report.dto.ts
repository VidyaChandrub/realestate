import { ApiProperty } from '@nestjs/swagger';

export class OthersSpecializationReportDto {
  @ApiProperty()
  value!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  parent!: string;

  @ApiProperty()
  parentId!: string | null;

  @ApiProperty()
  usageCount!: number;
}
