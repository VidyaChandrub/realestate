import { IsOptional, IsString, MaxLength, IsIn } from 'class-validator';

export class ReviewDomainRequestDto {
  @IsString()
  @IsIn(['approve', 'reject', 'request_changes'])
  action!: 'approve' | 'reject' | 'request_changes';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
