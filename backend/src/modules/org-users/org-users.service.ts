import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  approveOrgUser,
  assertCanAssignRole,
  deleteOrgUser,
  disapproveOrgUser,
  getOrgUserById,
  listOrgUsers,
  provisionInvitedUser,
  resendCredentials,
  setOrgUserStatus,
  updateOrgUser,
} from '../../common/utils/org-users.util';
import { assertOrgPermission } from '../../common/guards/permission.guard';
import type { PermissionAction } from '../../common/utils/permissions.util';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { CreateOrgUserDto } from './dto/create-org-user.dto';
import { UpdateOrgUserDto } from './dto/update-org-user.dto';
import { UpdateOrgUserStatusDto } from './dto/update-org-user-status.dto';
import { ListOrgUsersQueryDto } from './dto/list-org-users-query.dto';

@Injectable()
export class OrgUsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string, query: ListOrgUsersQueryDto) {
    return listOrgUsers(this.prisma, orgId, query);
  }

  /**
   * The org's active roles, for filtering and for the create/edit form.
   * `assignable` is false for Admin unless the caller is an org admin.
   */
  async roles(orgId: string, actor: JwtPayload) {
    const roles = await this.prisma.role.findMany({
      where: {
        status: 'active',
        scope: { in: ['organisation', 'team'] },
        OR: [{ orgId: null }, { orgId }],
      },
      select: { key: true, name: true },
      orderBy: { sortOrder: 'asc' },
    });
    const isAdmin = actor.roles?.includes('admin') ?? false;
    return roles
      .filter((role) => role.key !== 'super_admin')
      .map((role) => ({
        ...role,
        assignable: isAdmin || role.key !== 'admin',
      }));
  }

  create(orgId: string, actor: JwtPayload, dto: CreateOrgUserDto) {
    assertCanAssignRole(actor, dto.role);
    return provisionInvitedUser(this.prisma, orgId, dto);
  }

  getById(orgId: string, id: string) {
    return getOrgUserById(this.prisma, orgId, id);
  }

  update(orgId: string, actor: JwtPayload, id: string, dto: UpdateOrgUserDto) {
    assertCanAssignRole(actor, dto.role);
    if (dto.role && id === actor.sub) {
      throw new ForbiddenException('You cannot change your own role');
    }
    return updateOrgUser(this.prisma, orgId, id, dto);
  }

  async updateStatus(
    orgId: string,
    actor: JwtPayload,
    id: string,
    dto: UpdateOrgUserStatusDto,
  ) {
    // Same grants as the Activate / Deactivate buttons; any other status
    // change (back to pending) is a plain edit.
    const action: PermissionAction =
      dto.status === 'active'
        ? 'activate'
        : dto.status === 'disabled'
          ? 'deactivate'
          : 'edit';
    await assertOrgPermission(this.prisma, actor, 'users', action, true);

    if (id === actor.sub && dto.status === 'disabled') {
      throw new ForbiddenException('You cannot deactivate your own account');
    }
    return setOrgUserStatus(this.prisma, orgId, id, dto.status, true);
  }

  approve(orgId: string, id: string) {
    return approveOrgUser(this.prisma, orgId, id);
  }

  disapprove(orgId: string, id: string, actorUserId: string) {
    if (id === actorUserId) {
      throw new ForbiddenException('You cannot disapprove your own account');
    }
    return disapproveOrgUser(this.prisma, orgId, id);
  }

  resendInvite(orgId: string, id: string) {
    return resendCredentials(this.prisma, orgId, id);
  }

  remove(orgId: string, id: string, actorUserId: string) {
    if (id === actorUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    return deleteOrgUser(this.prisma, orgId, id);
  }
}
