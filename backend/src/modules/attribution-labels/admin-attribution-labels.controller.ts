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
import { AttributionLabelsService } from './attribution-labels.service';
import {
  CreateAttributionLabelDto,
  UpdateAttributionLabelDto,
} from './dto/update-attribution-label.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/attribution-labels')
export class AdminAttributionLabelsController {
  constructor(private readonly service: AttributionLabelsService) {}

  @Get()
  list() {
    return this.service.listAll();
  }

  @Post()
  create(@Body() dto: CreateAttributionLabelDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAttributionLabelDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
