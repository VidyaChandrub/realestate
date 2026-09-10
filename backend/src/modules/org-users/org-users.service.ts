import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  approveOrgUser,
  deleteOrgUser,
  disapproveOrgUser,
  getOrgUserById,
  listOrgUsers,
  provisionInvitedUser,
  resendCredentials,
  setOrgUserStatus,
  updateOrgUser,
} from '../../common/utils/org-users.util';
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

  create(orgId: string, dto: CreateOrgUserDto) {
    return provisionInvitedUser(this.prisma, orgId, dto);
  }

  getById(orgId: string, id: string) {
    return getOrgUserById(this.prisma, orgId, id);
  }

  update(orgId: string, id: string, dto: UpdateOrgUserDto) {
    return updateOrgUser(this.prisma, orgId, id, dto);
  }

  updateStatus(
    orgId: string,
    id: string,
    actorUserId: string,
    dto: UpdateOrgUserStatusDto,
  ) {
    if (id === actorUserId && dto.status === 'disabled') {
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
