import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrganisationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city?: string;
}
