import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { PlatformConfigService } from './platform-config.service';
import { UpdatePlatformConfigDto } from './dto/update-platform-config.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/platform-config')
export class PlatformConfigController {
  constructor(private readonly service: PlatformConfigService) {}

  @Get()
  getConfig() {
    return this.service.getConfig();
  }

  @Put()
  updateConfig(@Body() dto: UpdatePlatformConfigDto) {
    return this.service.updateConfig(dto);
  }
}
