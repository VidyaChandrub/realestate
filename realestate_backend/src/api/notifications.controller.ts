import {
    Controller,
    Get,
    Patch,
    Param,
    UseGuards,
    Query,
    Request,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from '../notifications/services/notifications.service';
import { ListNotificationsDto } from '../notifications/dto/list-notifications.dto';
import { PaginatedNotificationsResponseDto, NotificationResponseDto } from '../notifications/dto/notification-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @ApiOperation({ summary: 'Get paginated notifications for the authenticated user' })
    @ApiResponse({ status: 200, type: PaginatedNotificationsResponseDto })
    @Get()
    async findAll(
        @Request() req,
        @Query() query: ListNotificationsDto
    ): Promise<PaginatedNotificationsResponseDto> {
        const userId = req.user.userId;
        const { notifications, total, unreadCount } = await this.notificationsService.findAll(userId, query);

        return {
            notifications,
            total,
            unreadCount,
            page: query.page ?? 1,
            limit: query.limit ?? 20,
            totalPages: Math.ceil(total / (query.limit ?? 20)),
        };
    }

    @ApiOperation({ summary: 'Mark all notifications as read' })
    @ApiResponse({ status: 200, description: 'Returns the count of notifications marked as read' })
    @Patch('mark-all-read')
    async markAllRead(@Request() req, @Query('metadataTypes') metadataTypes?: string) {
        const userId = req.user.userId;
        const metadataTypesArray = metadataTypes
            ?.split(',')
            .map((v) => v.trim())
            .filter((v) => v.length > 0);
        return this.notificationsService.markAllRead(userId, metadataTypesArray);
    }

    @ApiOperation({ summary: 'Mark a specific notification as read' })
    @ApiResponse({ status: 200, type: NotificationResponseDto })
    @Patch(':id/read')
    async markAsRead(
        @Request() req,
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<NotificationResponseDto> {
        const userId = req.user.userId;
        return this.notificationsService.markAsRead(id, userId);
    }
}
