import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrganisationWithAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  adminFirstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  adminLastName: string;

  @IsEmail()
  adminEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  adminPhone?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  adminPassword?: string;

  @IsOptional()
  @IsString()
  status?: 'active' | 'pending' | 'draft';
}
