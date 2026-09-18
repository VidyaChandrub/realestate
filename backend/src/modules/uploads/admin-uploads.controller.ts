import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { UploadsService } from './uploads.service';
import { CreateMediaUploadUrlDto } from './dto/create-upload-url.dto';
import { RegisterMediaDto } from './dto/register-media.dto';
import { ListMediaQueryDto } from './dto/list-media-query.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { BulkDeleteMediaDto } from './dto/bulk-delete-media.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/media')
export class AdminUploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('upload-url')
  createUploadUrl(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMediaUploadUrlDto,
  ) {
    return this.uploadsService.createUploadUrl(user, dto);
  }

  @Post('register')
  registerMedia(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterMediaDto,
  ) {
    return this.uploadsService.registerMedia(user, dto);
  }

  @Get()
  adminListMedia(@Query() query: ListMediaQueryDto) {
    return this.uploadsService.adminListMedia(query);
  }

  @Get('stats')
  adminGetStats() {
    return this.uploadsService.adminGetStats();
  }

  @Patch(':id')
  updateMedia(@Param('id') id: string, @Body() dto: UpdateMediaDto) {
    return this.uploadsService.updateMedia(null, id, dto);
  }

  @Delete(':id')
  deleteMedia(@Param('id') id: string) {
    return this.uploadsService.deleteMedia(null, id);
  }

  @Post('bulk-delete')
  bulkDeleteMedia(@Body() dto: BulkDeleteMediaDto) {
    return this.uploadsService.bulkDeleteMedia(null, dto.ids);
  }
}
