import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class OnboardCompanyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  company_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;
}
