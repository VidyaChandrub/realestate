import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { TemplateCategoriesService } from './template-categories.service';
import { CreateTemplateCategoryDto } from './dto/create-category.dto';
import { UpdateTemplateCategoryDto } from './dto/update-category.dto';

@Controller('admin/template-categories')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminTemplateCategoriesController {
  constructor(private readonly service: TemplateCategoriesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() dto: CreateTemplateCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@Controller('template-categories')
export class PublicTemplateCategoriesController {
  constructor(private readonly service: TemplateCategoriesService) {}

  @Get()
  list() {
    return this.service.list();
  }
}
