import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateManualLeadDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  formName?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsObject()
  data: Record<string, unknown>;
}
