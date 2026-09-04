import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateEmailConfigDto {
  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @IsBoolean()
  secure: boolean;

  @IsString()
  @IsOptional()
  user?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsEmail()
  @IsNotEmpty()
  fromEmail: string;

  @IsString()
  @IsNotEmpty()
  fromName: string;

  @IsString()
  @IsOptional()
  replyTo?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  inviteSubject?: string;

  @IsString()
  @IsOptional()
  inviteBody?: string;

  @IsString()
  @IsOptional()
  resetSubject?: string;

  @IsString()
  @IsOptional()
  resetBody?: string;
}

export class SendTestEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsOptional()
  subject?: string;
}

export class ListEmailLogsDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  status?: string;

  @IsOptional()
  search?: string;
}
