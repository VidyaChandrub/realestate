import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DevicePlatform } from '@prisma/client';

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'FCM registration token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Unique identifier for the device' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({
    enum: DevicePlatform,
    description: 'Platform the device is running',
  })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @ApiPropertyOptional({ description: 'Human-readable device name' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'App version installed on the device' })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
