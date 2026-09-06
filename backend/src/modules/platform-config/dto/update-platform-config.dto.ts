import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
