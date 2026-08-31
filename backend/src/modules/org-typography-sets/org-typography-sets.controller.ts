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
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgTypographySetsService } from './org-typography-sets.service';
import { CreateTypographySetDto } from './dto/create-typography-set.dto';
import { UpdateTypographySetDto } from './dto/update-typography-set.dto';

// Every route derives orgId from the JWT — never from a client-supplied
// param — so one org can never read or touch another org's sets.
@UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
@Controller('org/typography-sets')
export class OrgTypographySetsController {
  constructor(private readonly service: OrgTypographySetsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.orgId as string);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTypographySetDto) {
    return this.service.create(user.orgId as string, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTypographySetDto,
  ) {
    return this.service.update(user.orgId as string, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.orgId as string, id);
  }
}
