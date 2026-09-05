import { IsOptional, IsString } from 'class-validator';

export class AssignSubdomainDto {
  @IsOptional()
  @IsString()
  subdomain?: string;
}
