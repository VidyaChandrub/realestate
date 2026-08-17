import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
import { generateTempPassword } from '../auth/utils/tokens.util';
import { toSafeUser } from '../auth/utils/mappers.util';
import { InviteDto } from './dto/invite.dto';

const BCRYPT_COST_FACTOR = 12;
const INVITE_ALLOWED_ROLES = ['admin', 'manager'];

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async invite(actor: JwtPayload, dto: InviteDto) {
    if (
      !actor.orgId ||
      !actor.roles.some((role) => INVITE_ALLOWED_ROLES.includes(role))
    ) {
      throw new ForbiddenException(
        'Only Admins or Managers can invite team members',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const role = await this.prisma.role.findUniqueOrThrow({
      where: { key: dto.role },
    });

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_COST_FACTOR);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          orgId: actor.orgId!,
          firstName: dto.first_name,
          lastName: dto.last_name,
          email: dto.email,
          passwordHash,
          status: 'active',
          mustChangePassword: true,
        },
      });

      await tx.userRole.create({
        data: { userId: created.id, roleId: role.id },
      });

      return created;
    });

    // Stub — real email provider not wired up yet.
    console.log(
      `[stub email] To: ${user.email} | Subject: Your BigEstate account | Temporary password: ${tempPassword}`,
    );

    return toSafeUser(user);
  }
}
