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

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/templates')
export class AdminTemplatesController {
  constructor(private readonly adminTemplatesService: AdminTemplatesService) {}

  @Get()
  list(@Query() query: ListTemplatesQueryDto) {
    return this.adminTemplatesService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.adminTemplatesService.getById(id);
  }

  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.adminTemplatesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.adminTemplatesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.adminTemplatesService.remove(id);
  }

  @Post(':id/reset')
  @HttpCode(200)
  reset(@Param('id') id: string, @Body() dto: ResetTemplateDto) {
    return this.adminTemplatesService.reset(id, dto);
  }

  @Post(':id/duplicate')
  @HttpCode(201)
  duplicate(@Param('id') id: string) {
    return this.adminTemplatesService.duplicate(id);
  }
}
