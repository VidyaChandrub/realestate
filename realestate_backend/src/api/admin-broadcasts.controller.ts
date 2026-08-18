import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { BroadcastsService } from '../broadcasts/services/broadcasts.service';
import { CreateBroadcastDto } from '../broadcasts/dto/create-broadcast.dto';
import { ListBroadcastsQueryDto } from '../broadcasts/dto/list-broadcasts-query.dto';

@ApiTags('Admin Broadcasts')
@ApiBearerAuth()
@Controller('api/v1/admin/broadcasts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminBroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Post()
  async create(@Body() dto: CreateBroadcastDto, @Req() req: any) {
    const data = await this.broadcastsService.createAndSend(dto, req.user.userId);
    // `summary` is additive - existing `data` shape is unchanged, so any client reading
    // response.data continues to work exactly as before.
    return {
      success: true,
      data,
      summary: {
        recipientCount: data.recipientCount,
        successCount: data.successCount,
        failureCount: data.failureCount,
        status: data.status,
      },
    };
  }

  @Get()
  async findAll(@Query() query: ListBroadcastsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.broadcastsService.findAll(page, limit, query.search);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  // ParseUUIDPipe review: BroadcastNotification.id is `String @id @default(uuid())` - a plain
  // TEXT column, not `@db.Uuid` - but Prisma's `uuid()` default always generates a v4 UUID
  // string, and no other code path writes this id. ParseUUIDPipe only validates the *format*
  // of the incoming param (it never touches the DB column type), so it correctly rejects
  // malformed ids before they reach Prisma. This mirrors the same String-id + ParseUUIDPipe
  // pattern already used elsewhere in this codebase (e.g. AdminController's `users/:id`
  // against `User.id`, which is likewise `String @id @default(uuid())`). No change needed.
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.broadcastsService.findById(id);
    return { success: true, data };
  }
}
