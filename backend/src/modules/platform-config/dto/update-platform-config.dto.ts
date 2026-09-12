import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdatePlatformConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(253)
  subdomainBase?: string;

  @IsOptional()
  @IsIn(['localhost', 'production'])
  subdomainMode?: 'localhost' | 'production';

  @IsOptional()
  @IsIn(['a', 'cname', 'ns'])
  dnsMode?: 'a' | 'cname' | 'ns';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  infraIp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  infraIpv6?: string;

  @IsOptional()
  @IsString()
  @MaxLength(253)
  infraCname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(253)
  infraNs1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(253)
  infraNs2?: string;

  /** Days before renewsAt the "expiring soon" popup notification fires. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  billingExpiryNotifyDays?: number;

  /** Days a past_due subscription stays usable before the expiry behaviour. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  billingGracePeriodDays?: number;

  /** What happens when the grace period lapses: 'restrict' | 'cancel'. */
  @IsOptional()
  @IsIn(['restrict', 'cancel'])
  billingExpiryBehavior?: 'restrict' | 'cancel';

  /** Notification body for the expiring / past-due popups. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  billingExpiryMessage?: string;
}
