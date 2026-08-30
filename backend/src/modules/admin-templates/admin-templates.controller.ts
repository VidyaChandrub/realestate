import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminTemplatesService } from './admin-templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ListTemplatesQueryDto } from './dto/list-templates-query.dto';
import { ResetTemplateDto } from './dto/reset-template.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';

@Controller('admin/templates')
export class AdminTemplatesController {
  constructor(private readonly adminTemplatesService: AdminTemplatesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  list(@Query() query: ListTemplatesQueryDto) {
    return this.adminTemplatesService.list(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  getById(@Param('id') id: string) {
    return this.adminTemplatesService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  create(@Body() dto: CreateTemplateDto) {
    return this.adminTemplatesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.adminTemplatesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.adminTemplatesService.remove(id);
  }

  @Post(':id/reset')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @HttpCode(200)
  reset(@Param('id') id: string, @Body() dto: ResetTemplateDto) {
    return this.adminTemplatesService.reset(id, dto);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @HttpCode(201)
  duplicate(@Param('id') id: string) {
    return this.adminTemplatesService.duplicate(id);
  }

  // Presigned URL for a builder image upload — browser PUTs straight to R2,
  // then the URL is stored in `content` (no base64).
  @Post(':id/upload-url')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  createUploadUrl(@Param('id') id: string, @Body() dto: CreateUploadUrlDto) {
    return this.adminTemplatesService.createUploadUrl(id, dto);
  }
}

@Controller('templates')
export class PublicTemplatesController {
  constructor(private readonly adminTemplatesService: AdminTemplatesService) {}

  @Get()
  listPublic(@Query() query: ListTemplatesQueryDto) {
    // Public for registration — only published landing templates, display
    // fields only. status/pageType/includeContent are forced, never taken
    // from the client: this is an unauthenticated endpoint and must never
    // expose drafts, thank-you pages, or full section/config content.
    return this.adminTemplatesService.list({
      ...query,
      status: 'published',
      pageType: 'landing',
      includeContent: false,
    } as any);
  }

  @Get(':id')
  getPublicById(@Param('id') id: string) {
    // Same eligibility filter as the list — an unauthenticated caller must
    // never be able to fetch a draft or thank-you page by guessing its id.
    return this.adminTemplatesService.getPublicById(id);
  }
}
