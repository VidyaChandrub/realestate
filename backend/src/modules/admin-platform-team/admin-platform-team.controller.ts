import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { AdminPlatformTeamService } from './admin-platform-team.service';
import { CreatePlatformMemberDto } from './dto/create-platform-member.dto';
import { UpdatePlatformMemberDto } from './dto/update-platform-member.dto';
import { ListPlatformMembersQueryDto } from './dto/list-platform-members-query.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/platform-team')
export class AdminPlatformTeamController {
  constructor(private readonly platformTeam: AdminPlatformTeamService) {}

  @Get()
  list(@Query() query: ListPlatformMembersQueryDto) {
    return this.platformTeam.list(query);
  }

  @Get('roles')
  listRoles() {
    return this.platformTeam.listAssignableRoles();
  }

  // Declared after `roles` so that literal path is never captured as an id.
  @Get(':id')
  get(@Param('id') id: string) {
    return this.platformTeam.get(id);
  }

  @Post()
  create(@CurrentUser() actor: JwtPayload, @Body() dto: CreatePlatformMemberDto) {
    return this.platformTeam.create(dto, actor.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformMemberDto,
  ) {
    return this.platformTeam.update(id, actor.sub, dto, actor.roles);
  }

  @Delete(':id')
  remove(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.platformTeam.remove(id, actor.sub);
  }
}
