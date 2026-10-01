import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class UpdateAttributionLabelDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateAttributionLabelDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'key must be snake_case (a-z, 0-9, underscore)',
  })
  key!: string;

  @IsString()
  @MaxLength(80)
  label!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
