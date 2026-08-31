import { IsEnum, IsOptional, IsUUID } from 'class-validator';

// Signup wizard — Step 5 (Subscription, mandatory).
export class SubscriptionStepDto {
  @IsUUID()
  planId: string;

  @IsOptional()
  @IsEnum(['monthly', 'yearly'] as const)
  billingCycle?: 'monthly' | 'yearly';
}
