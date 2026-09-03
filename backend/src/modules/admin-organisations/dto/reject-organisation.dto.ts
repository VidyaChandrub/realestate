import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectOrganisationDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'A rejection reason is required' })
  @MinLength(3, { message: 'Rejection reason must be at least 3 characters' })
  @MaxLength(500)
  reason: string;
}
