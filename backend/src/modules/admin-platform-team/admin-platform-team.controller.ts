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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { AdminPlatformTeamService } from './admin-platform-team.service';
import { CreatePlatformMemberDto } from './dto/create-platform-member.dto';
import { UpdatePlatformMemberDto } from './dto/update-platform-member.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/platform-team')
export class AdminPlatformTeamController {
  constructor(private readonly platformTeam: AdminPlatformTeamService) {}

  @Get()
  list() {
    return this.platformTeam.list();
  }

  @Get('roles')
  listRoles() {
    return this.platformTeam.listAssignableRoles();
  }

  @Post()
  create(@Body() dto: CreatePlatformMemberDto) {
    return this.platformTeam.create(dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformMemberDto,
  ) {
    return this.platformTeam.update(id, actor.sub, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.platformTeam.remove(id, actor.sub);
  }
}
