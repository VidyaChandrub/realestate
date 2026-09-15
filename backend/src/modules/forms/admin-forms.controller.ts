import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';

// Super Admin console Lead Forms — platform-wide (orgId null), never mixed
// with organisation forms. The SuperAdminGuard resolves the required platform
// permission (admin_forms) from the route map + HTTP verb.
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/forms')
export class AdminFormsController {
  constructor(private readonly service: FormsService) {}

  @Get()
  list() {
    return this.service.list(null);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(null, id);
  }

  @Post()
  create(@Body() dto: CreateFormDto) {
    return this.service.create(null, dto);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.service.duplicate(null, id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFormDto) {
    return this.service.update(null, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(null, id);
  }
}