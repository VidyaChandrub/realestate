import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class RecordEventDto {
  @IsString()
  @IsNotEmpty()
  landingPageId!: string;

  @IsString()
  @IsNotEmpty()
  eventType!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
