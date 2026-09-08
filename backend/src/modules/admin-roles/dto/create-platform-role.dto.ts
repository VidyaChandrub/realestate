import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePlatformRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  key?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
