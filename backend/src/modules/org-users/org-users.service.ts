import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  getOrgUserById,
  listOrgUsers,
  provisionInvitedUser,
  reissueInvite,
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
    return setOrgUserStatus(this.prisma, orgId, id, dto.status);
  }

  resendInvite(orgId: string, id: string) {
    return reissueInvite(this.prisma, id, orgId);
  }
}
