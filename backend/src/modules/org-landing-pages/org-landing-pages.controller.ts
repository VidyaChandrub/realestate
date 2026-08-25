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
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgLandingPagesService } from './org-landing-pages.service';
import { CreateLandingPageDto } from './dto/create-landing-page.dto';
import { UpdateLandingPageDto } from './dto/update-landing-page.dto';
import { ListLandingPagesQueryDto } from './dto/list-landing-pages-query.dto';

// Every route derives orgId from the JWT — never from a client-supplied
// param — so one org can never read or touch another org's pages.
@UseGuards(JwtAuthGuard, OrgAdminGuard)
@Controller('org/landing-pages')
export class OrgLandingPagesController {
  constructor(private readonly service: OrgLandingPagesService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateLandingPageDto) {
    return this.service.create(user.orgId as string, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListLandingPagesQueryDto) {
    return this.service.list(user.orgId as string, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getById(user.orgId as string, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLandingPageDto,
  ) {
    return this.service.update(user.orgId as string, id, dto);
  }

  @Post(':id/submit')
  @HttpCode(200)
  submit(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.submit(user.orgId as string, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.orgId as string, id);
  }
}
