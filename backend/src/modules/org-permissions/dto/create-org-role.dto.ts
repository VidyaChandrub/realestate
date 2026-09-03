import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Org Admin creating a custom role scoped to their own organisation. */
export class CreateOrgRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
