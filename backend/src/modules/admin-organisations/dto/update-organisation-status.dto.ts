import { IsIn } from 'class-validator';

const ORG_SETTABLE_STATUS_VALUES = ['active', 'disabled'] as const;
export type OrgSettableStatus = (typeof ORG_SETTABLE_STATUS_VALUES)[number];

export class UpdateOrganisationStatusDto {
  @IsIn(ORG_SETTABLE_STATUS_VALUES)
  status: OrgSettableStatus;
}
