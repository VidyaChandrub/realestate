import { IsString, IsOptional } from 'class-validator';

export class AdvertisementClickDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  metadata?: string;
}
