import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { TeamService } from './team.service';
import { InviteDto } from './dto/invite.dto';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
  @RequirePermission('users', 'add', { enforceForOrgAdmin: true })
  @Post('invite')
  invite(@CurrentUser() actor: JwtPayload, @Body() dto: InviteDto) {
    return this.teamService.invite(actor, dto);
  }
}
