import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateMasterDataDto } from './create-master-data.dto';

export class UpdateMasterDataDto extends PartialType(CreateMasterDataDto) {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
