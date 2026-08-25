import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectLandingPageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}
