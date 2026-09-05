import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.interface';
import { provisionInvitedUser } from '../../common/utils/org-users.util';
import { InviteDto } from './dto/invite.dto';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async invite(actor: JwtPayload, dto: InviteDto) {
    if (!actor.orgId) {
      throw new ForbiddenException('Organisation context required');
    }

    return provisionInvitedUser(this.prisma, actor.orgId, {
      firstName: dto.first_name,
      lastName: dto.last_name,
      email: dto.email,
      role: dto.role,
    });
  }
}
