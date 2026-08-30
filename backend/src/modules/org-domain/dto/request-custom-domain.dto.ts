import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RequestCustomDomainDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(253)
  domain!: string;
}
