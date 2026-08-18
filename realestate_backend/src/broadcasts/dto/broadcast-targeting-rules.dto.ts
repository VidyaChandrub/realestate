import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class BroadcastTargetingRulesDto {
  @ApiPropertyOptional({ type: [String], description: 'Category IDs of type EDUCATION_LEVEL' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  educationLevelIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Category IDs of type SPECIALIZATION' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  specializationIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Category IDs of type SKILL' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  skillIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Category IDs of type EXPERIENCE_LEVEL' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  experienceLevelIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Category IDs of type LOCATION_COUNTRY' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  countryIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Category IDs of type LOCATION_STATE' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  stateIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Category IDs of type LOCATION_CITY' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  cityIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Education years of passing, e.g. ["2022", "2023"]' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  yearOfPassing?: string[];
}
