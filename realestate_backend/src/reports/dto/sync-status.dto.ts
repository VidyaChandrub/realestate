import { ApiProperty } from '@nestjs/swagger';

export class SyncStatusDto {
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastSyncDate: Date | null = null;

  @ApiProperty({ type: Number, nullable: true })
  lastSyncUpdatedCount: number | null = null;
}
