import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum BillingCycleDto {
  monthly = 'monthly',
  yearly = 'yearly',
}

export enum SubscriptionStatusDto {
  active = 'active',
  past_due = 'past_due',
  trial = 'trial',
  cancelled = 'cancelled',
  paused = 'paused',
}

export class CreateSubscriptionDto {
  @IsUUID()
  orgId!: string;

  @IsUUID()
  planId!: string;

  @IsOptional()
  @IsEnum(BillingCycleDto)
  billingCycle?: BillingCycleDto;

  @IsOptional()
  @IsEnum(SubscriptionStatusDto)
  status?: SubscriptionStatusDto;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  renewsAt?: string; // ISO date
}
