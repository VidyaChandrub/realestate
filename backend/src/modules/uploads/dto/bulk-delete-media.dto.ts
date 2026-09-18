import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class BulkDeleteMediaDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids!: string[];
}
