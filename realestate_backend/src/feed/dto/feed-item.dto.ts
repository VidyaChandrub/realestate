import { ApiProperty } from '@nestjs/swagger';

export enum FeedItemType {
  JOB = 'JOB',
  EVENT = 'EVENT',
  AD = 'AD',
}

export class FeedItemDto {
  @ApiProperty({ enum: FeedItemType })
  type: FeedItemType;

  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  matchScore: number | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  payload: Record<string, unknown>;
}

export class FeedResponseDto {
  @ApiProperty({ type: [FeedItemDto] })
  items: FeedItemDto[];

  @ApiProperty({ nullable: true })
  nextCursor: string | null;
}
