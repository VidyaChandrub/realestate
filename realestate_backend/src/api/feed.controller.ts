import { Body, Controller, Get, HttpCode, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeedResponseDto } from '../feed/dto/feed-item.dto';
import { GetFeedQueryDto } from '../feed/dto/get-feed-query.dto';
import { MarkFeedImpressionsDto } from '../feed/dto/mark-feed-impressions.dto';
import { FeedService } from '../feed/feed.service';

@Controller('api/v1/feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getFeed(@Request() req, @Query() query: GetFeedQueryDto): Promise<{ success: true; data: FeedResponseDto }> {
    const data = await this.feedService.getFeed(req.user, query);
    return {
      success: true,
      data,
    };
  }

  // Called by the client when feed items actually become visible (e.g. cross a
  // viewport visibility threshold), not merely when they're returned by GET /feed.
  // This is what drives hideSeenFeeds exclusion — see FeedService.markImpressions.
  @UseGuards(JwtAuthGuard)
  @Post('impressions')
  @HttpCode(204)
  async markImpressions(@Request() req, @Body() body: MarkFeedImpressionsDto): Promise<void> {
    await this.feedService.markImpressions(req.user.userId, body.items);
  }
}
