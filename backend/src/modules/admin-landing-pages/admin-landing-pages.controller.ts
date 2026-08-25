import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { AdminLandingPagesService } from './admin-landing-pages.service';
import { ListAdminLandingPagesQueryDto } from './dto/list-admin-landing-pages-query.dto';
import { RejectLandingPageDto } from './dto/reject-landing-page.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/landing-pages')
export class AdminLandingPagesController {
  constructor(private readonly service: AdminLandingPagesService) {}

  @Get()
  list(@Query() query: ListAdminLandingPagesQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.service.approve(id, actor);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(
    @Param('id') id: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: RejectLandingPageDto,
  ) {
    return this.service.reject(id, actor, dto.reason);
  }

  @Post(':id/publish')
  @HttpCode(200)
  publish(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.service.publish(id, actor);
  }
}
