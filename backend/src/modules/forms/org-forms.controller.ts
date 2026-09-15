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
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';

// Org-scoped Lead Forms — the org's own builder library. orgId always comes
// from the JWT, never the client, so org A can never read/touch org B's
// forms. Gated by the `forms` module so the Super Admin console and org
// members each only ever see their own side.
@UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/forms')
export class OrgFormsController {
  constructor(private readonly service: FormsService) {}

  @RequirePermission('forms', 'view')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.orgId as string);
  }

  @RequirePermission('forms', 'view')
  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.get(user.orgId as string, id);
  }

  @RequirePermission('forms', 'add')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateFormDto) {
    return this.service.create(user.orgId as string, dto);
  }

  @RequirePermission('forms', 'add')
  @Post(':id/duplicate')
  duplicate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.duplicate(user.orgId as string, id);
  }

  @RequirePermission('forms', 'edit')
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateFormDto,
  ) {
    return this.service.update(user.orgId as string, id, dto);
  }

  @RequirePermission('forms', 'delete')
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.orgId as string, id);
  }
}