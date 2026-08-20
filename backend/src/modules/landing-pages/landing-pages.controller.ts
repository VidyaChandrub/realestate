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
import { LandingPagesService } from './landing-pages.service';
import { CreateLandingPageDto } from './dto/create-landing-page.dto';
import { UpdateLandingPageDto } from './dto/update-landing-page.dto';
import { SaveDocumentDto } from './dto/save-document.dto';
import { ListLandingPagesQueryDto } from './dto/list-landing-pages-query.dto';
import { CreateSectionTemplateDto } from './dto/create-section-template.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/landing-pages')
export class LandingPagesController {
  constructor(private readonly landingPagesService: LandingPagesService) {}

  @Get()
  list(@Query() query: ListLandingPagesQueryDto) {
    return this.landingPagesService.list(query);
  }

  @Get('section-templates')
  listSectionTemplates() {
    return this.landingPagesService.listSectionTemplates();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.landingPagesService.getById(id);
  }

  @Post()
  create(@Body() dto: CreateLandingPageDto) {
    return this.landingPagesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLandingPageDto) {
    return this.landingPagesService.update(id, dto);
  }

  @Post(':id/document')
  @HttpCode(200)
  saveDocument(@Param('id') id: string, @Body() dto: SaveDocumentDto) {
    return this.landingPagesService.saveDocument(id, dto);
  }

  @Post(':id/publish')
  @HttpCode(200)
  publish(@Param('id') id: string) {
    return this.landingPagesService.publish(id);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  unpublish(@Param('id') id: string) {
    return this.landingPagesService.unpublish(id);
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(@Param('id') id: string) {
    return this.landingPagesService.archive(id);
  }

  @Post(':id/status')
  @HttpCode(200)
  setStatus(
    @Param('id') id: string,
    @Body('status') status: 'draft' | 'published' | 'archived',
  ) {
    return this.landingPagesService.setStatus(id, status);
  }

  @Post(':id/duplicate')
  @HttpCode(201)
  duplicate(@Param('id') id: string) {
    return this.landingPagesService.duplicate(id);
  }

  @Post('section-templates')
  createSectionTemplate(@Body() dto: CreateSectionTemplateDto) {
    return this.landingPagesService.createSectionTemplate(dto);
  }

  @Delete('section-templates/:templateId')
  deleteSectionTemplate(@Param('templateId') templateId: string) {
    return this.landingPagesService.deleteSectionTemplate(templateId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.landingPagesService.remove(id);
  }
}
