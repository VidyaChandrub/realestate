import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum ChangePlanBillingCycle {
  monthly = 'monthly',
  yearly = 'yearly',
}

export class ChangePlanDto {
  @IsUUID()
  planId!: string;

  @IsOptional()
  @IsEnum(ChangePlanBillingCycle)
  billingCycle?: ChangePlanBillingCycle;
}
