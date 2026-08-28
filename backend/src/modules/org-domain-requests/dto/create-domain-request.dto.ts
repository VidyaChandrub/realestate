import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDomainRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(253)
  landingPageId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(253)
  domain!: string;
}
