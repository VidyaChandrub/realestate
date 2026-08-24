import { IsIn } from 'class-validator';
import { ORG_USER_STATUS_VALUES } from '../../../common/utils/org-users.util';
import type { OrgUserStatus } from '../../../common/utils/org-users.util';

export class UpdateOrgUserStatusDto {
  @IsIn(ORG_USER_STATUS_VALUES)
  status: OrgUserStatus;
}
