import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const SEND_VIA_CHANNELS = ['email', 'whatsapp', 'sms'] as const;
export type SendViaChannel = (typeof SEND_VIA_CHANNELS)[number];

export class OnboardAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name: string;

  @IsEmail()
  work_email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone_number: string;

  @IsOptional()
  @IsBoolean()
  force_password_change?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(SEND_VIA_CHANNELS, { each: true })
  send_via?: SendViaChannel[];
}
