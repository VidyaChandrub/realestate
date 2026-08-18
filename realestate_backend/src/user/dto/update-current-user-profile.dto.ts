import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateCurrentUserProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ description: 'Phone number in international format or numeric digits only' })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phoneNumber must be a valid phone number',
  })
  phoneNumber?: string;
}
