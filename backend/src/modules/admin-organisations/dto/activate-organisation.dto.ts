import { IsArray, IsOptional, IsString } from 'class-validator';

export class ActivateOrganisationDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  template_ids?: string[];
}
