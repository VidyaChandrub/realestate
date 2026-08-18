import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsUUID, ValidateNested } from 'class-validator';
import { FeedItemType } from './feed-item.dto';

// Only organic feed items (jobs/events) can be marked viewed — ads have their own
// impression tracking (AnalyticsEventType.AD_IMPRESSION).
const VIEWABLE_FEED_ITEM_TYPES = [FeedItemType.JOB, FeedItemType.EVENT] as const;

export class FeedImpressionItemDto {
  @ApiProperty()
  @IsUUID()
  entityId: string;

  @ApiProperty({ enum: VIEWABLE_FEED_ITEM_TYPES })
  @IsIn(VIEWABLE_FEED_ITEM_TYPES)
  entityType: FeedItemType.JOB | FeedItemType.EVENT;
}

export class MarkFeedImpressionsDto {
  @ApiProperty({ type: [FeedImpressionItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FeedImpressionItemDto)
  items: FeedImpressionItemDto[];
}
