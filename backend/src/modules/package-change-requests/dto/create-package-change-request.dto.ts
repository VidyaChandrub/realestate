import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BillingCycle } from '@prisma/client';

export class CreatePackageChangeRequestDto {
  @IsString()
  @IsNotEmpty()
  targetPlanId: string;

  @IsOptional()
  @IsEnum(['monthly', 'yearly'])
  billingCycle?: BillingCycle;
}
