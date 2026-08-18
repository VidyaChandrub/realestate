import { ApiProperty } from '@nestjs/swagger';
import { OthersSpecializationReportDto } from './others-specialization-report.dto';

export class PaginatedOthersSpecializationReportDto {
  @ApiProperty({ type: [OthersSpecializationReportDto] })
  items!: OthersSpecializationReportDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
