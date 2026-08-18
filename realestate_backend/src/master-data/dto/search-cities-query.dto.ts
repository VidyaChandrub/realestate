import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class SearchCitiesQueryDto {
  @ApiPropertyOptional({
    description: 'City search term. Minimum 3 characters.',
    minLength: 3,
    example: 'ban',
  })
  @IsString()
  @MinLength(3)
  value!: string;

  @ApiPropertyOptional({
    description: 'Optional parent state master data ID filter.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
