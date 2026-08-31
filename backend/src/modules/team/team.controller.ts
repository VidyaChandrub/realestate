import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { TeamService } from './team.service';
import { InviteDto } from './dto/invite.dto';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  // Org-facing, not part of the signup wizard (that's
  // OnboardingController's own /onboarding/invite, deliberately exempt
  // from OrgApprovedGuard since every org is 'pending' throughout it) —
  // real team invites wait for approval like everything else dashboard-side.
  @UseGuards(JwtAuthGuard, OrgApprovedGuard)
  @Post('invite')
  invite(@CurrentUser() actor: JwtPayload, @Body() dto: InviteDto) {
    return this.teamService.invite(actor, dto);
  }
}
