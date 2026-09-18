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
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { UploadsService } from './uploads.service';
import { CreateMediaUploadUrlDto } from './dto/create-upload-url.dto';
import { RegisterMediaDto } from './dto/register-media.dto';
import { ListMediaQueryDto } from './dto/list-media-query.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { BulkDeleteMediaDto } from './dto/bulk-delete-media.dto';

@UseGuards(JwtAuthGuard, OrgApprovedGuard)
@Controller('org/media')
export class UploadsController {
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
  listOrgMedia(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListMediaQueryDto,
  ) {
    return this.uploadsService.listOrgMedia(user.orgId as string, query);
  }

  @Get('stats')
  getOrgStats(@CurrentUser() user: JwtPayload) {
    return this.uploadsService.getOrgStats(user.orgId as string);
  }

  @Patch(':id')
  updateMedia(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMediaDto,
  ) {
    return this.uploadsService.updateMedia(user.orgId as string, id, dto);
  }

  @Delete(':id')
  deleteMedia(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.uploadsService.deleteMedia(user.orgId as string, id);
  }

  @Post('bulk-delete')
  bulkDeleteMedia(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkDeleteMediaDto,
  ) {
    return this.uploadsService.bulkDeleteMedia(user.orgId as string, dto.ids);
  }
}
