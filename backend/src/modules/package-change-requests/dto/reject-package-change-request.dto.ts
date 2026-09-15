import { IsOptional, IsString } from 'class-validator';

export class RejectPackageChangeRequestDto {
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
